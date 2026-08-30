import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Account creation and password resets live here rather than in the web app so
// the service-role key never has to be copied into the hosting provider — the
// edge runtime injects it. verify_jwt is off because self-registration and
// password resets are anonymous by design; the privileged "create" action
// authenticates the caller itself and rejects anyone who is not an active admin.

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PHONE_EMAIL_DOMAIN = "khaboki.local";
const MAX_CODE_ATTEMPTS = 5;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const normalizePhone = (raw: string) => String(raw ?? "").replace(/[^\d]/g, "");

const serviceClient = () =>
  createClient(URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

function validate(name: string, phone: string, password: string): string | null {
  const cleanName = String(name ?? "").trim();
  const digits = normalizePhone(phone);
  if (cleanName.length < 2 || cleanName.length > 80) return "Enter a full name.";
  if (digits.length < 6 || digits.length > 15) return "Enter a valid phone number.";
  if (String(password ?? "").length < 8) return "Password must be at least 8 characters.";
  return null;
}

async function createAccount(
  name: string,
  phone: string,
  password: string,
  role: "employee" | "staff" | "admin",
) {
  const admin = serviceClient();

  const digits = normalizePhone(phone);
  const { error } = await admin.auth.admin.createUser({
    email: `${digits}@${PHONE_EMAIL_DOMAIN}`,
    password,
    email_confirm: true,
    user_metadata: { name: String(name).trim(), phone: digits, role },
  });

  if (error) {
    return error.message.toLowerCase().includes("already")
      ? "That phone number already has an account."
      : "Couldn't create the account. Try again.";
  }
  return null;
}

// Finishes a reset an admin has already approved. Everything is checked here
// against the service-role client: the caller is signed out, so nothing the
// request says about who they are can be trusted.
async function resetPassword(phone: string, code: string, password: string) {
  const digits = normalizePhone(phone);
  if (digits.length < 6 || digits.length > 15) return "Enter a valid phone number.";
  if (!/^\d{6}$/.test(String(code ?? "").trim())) return "That code isn't right.";
  if (String(password ?? "").length < 8) return "Password must be at least 8 characters.";

  const admin = serviceClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, status")
    .eq("phone", digits)
    .maybeSingle();

  // Same wording for "no such account", "no approved request" and "wrong code"
  // so this can't be used to enumerate who has an account or a pending reset.
  const REFUSED = "No approved reset for that number, or the code is wrong.";
  if (!profile || profile.status !== "active") return REFUSED;

  const { data: reset } = await admin
    .from("password_resets")
    .select("id, code, attempts, expires_at")
    .eq("user_id", profile.id)
    .eq("status", "approved")
    .maybeSingle();

  if (!reset) return REFUSED;
  if (reset.expires_at && new Date(reset.expires_at) < new Date()) {
    return "That code has expired. Ask your admin again.";
  }
  if (reset.attempts >= MAX_CODE_ATTEMPTS) {
    return "Too many wrong tries. Ask your admin to approve a new request.";
  }

  if (reset.code !== String(code).trim()) {
    await admin
      .from("password_resets")
      .update({ attempts: reset.attempts + 1 })
      .eq("id", reset.id);
    return REFUSED;
  }

  const { error } = await admin.auth.admin.updateUserById(profile.id, { password });
  if (error) return "Couldn't change the password. Try again.";

  // Burn the code so it can only ever be used once.
  await admin
    .from("password_resets")
    .update({ status: "used", code: null, resolved_at: new Date().toISOString() })
    .eq("id", reset.id);

  return null;
}


// Resolves the caller's own profile, and only if they are an active admin.
async function callingAdmin(req: Request): Promise<{ id: string } | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const admin = serviceClient();
  const { data: caller, error } = await admin.auth.getUser(token);
  if (error || !caller?.user) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("role, status")
    .eq("id", caller.user.id)
    .single();

  if (!profile || profile.role !== "admin" || profile.status !== "active") return null;
  return { id: caller.user.id };
}

async function deleteAccount(callerId: string, userId: string) {
  if (!userId) return "Pick someone to delete.";
  if (userId === callerId) return "You can't delete your own account.";

  const admin = serviceClient();

  const { data: target } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return "That account no longer exists.";

  // No "last admin" check: the caller is always an active admin, so if the
  // target were the only one, this would already have been a self-delete.

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return "Couldn't delete that account. Try again.";
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  const { action, name, phone, password } = body;

  // Public path: finish a reset an admin approved. No name to validate here,
  // so this runs before the account-creation checks.
  if (action === "reset_password") {
    const error = await resetPassword(phone, body.code, password);
    return error ? json({ error }, 400) : json({ ok: true });
  }

  // Privileged path: removing an account for good. Cascades take their orders,
  // bans and pick rules with them, which is the difference between this and
  // deactivating someone.
  if (action === "delete") {
    const caller = await callingAdmin(req);
    if (!caller) return json({ error: "Not authorised." }, 403);

    const error = await deleteAccount(caller.id, body.userId);
    return error ? json({ error }, 400) : json({ ok: true });
  }

  const invalid = validate(name, phone, password);
  if (invalid) return json({ error: invalid }, 400);

  // Public path: anyone may register, but only ever as an employee, and the
  // profiles trigger parks them in 'pending' until an admin approves.
  if (action === "register") {
    const error = await createAccount(name, phone, password, "employee");
    return error ? json({ error }, 400) : json({ ok: true });
  }

  // Privileged path: caller must present a JWT belonging to an active admin.
  if (action === "create") {
    const caller = await callingAdmin(req);
    if (!caller) return json({ error: "Not authorised." }, 403);

    const role = body.role === "admin" ? "admin" : "staff";
    const error = await createAccount(name, phone, password, role);
    return error ? json({ error }, 400) : json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});

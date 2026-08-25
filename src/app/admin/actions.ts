"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { isValidPhone, normalizePhone, phoneToEmail } from "@/lib/phone";

type Result = { error?: string; message?: string };

export async function approveUser(userId: string): Promise<Result> {
  const admin = await requireRole("admin");
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ status: "active", approved_by: admin.id, approved_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/admin");
  return {};
}

export async function setUserStatus(userId: string, status: "active" | "inactive"): Promise<Result> {
  const admin = await requireRole("admin");
  if (userId === admin.id) return { error: "You can't deactivate your own account." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/admin");
  return {};
}

// Staff and admin accounts are created here, not self-registered — the
// service-role client is the only way to mint an auth user server-side.
export async function createUser(
  name: string,
  phone: string,
  password: string,
  role: "staff" | "admin",
): Promise<Result> {
  await requireRole("admin");

  if (name.trim().length < 2) return { error: "Enter a full name." };
  if (!isValidPhone(phone)) return { error: "Enter a valid phone number." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." };
  }

  const { error } = await admin.auth.admin.createUser({
    email: phoneToEmail(phone),
    password,
    email_confirm: true,
    user_metadata: { name: name.trim(), phone: normalizePhone(phone), role },
  });

  if (error) {
    return {
      error: error.message.toLowerCase().includes("already")
        ? "That phone number already has an account."
        : error.message,
    };
  }

  revalidatePath("/admin");
  return { message: `${role === "admin" ? "Admin" : "Staff"} account created.` };
}

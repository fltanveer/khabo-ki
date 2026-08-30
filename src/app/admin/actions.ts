"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { isValidPhone } from "@/lib/phone";
import { callUsersFunction } from "@/lib/users-api";
import type { ActionResult } from "@/lib/errors";

type Result = ActionResult & { created?: boolean };

export async function approveUser(userId: string): Promise<Result> {
  const admin = await requireRole("admin");
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ status: "active", approved_by: admin.id, approved_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { error: "generic" };
  revalidatePath("/admin");
  return {};
}

export async function setUserStatus(userId: string, status: "active" | "inactive"): Promise<Result> {
  const admin = await requireRole("admin");
  if (userId === admin.id) return { error: "self_deactivate" };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);

  if (error) return { error: "generic" };
  revalidatePath("/admin");
  return {};
}

// Staff and admin accounts are created here, not self-registered. The actual
// mint happens in the `users` edge function, which re-checks that the caller
// is an active admin against the session token we forward.
export async function createUser(
  name: string,
  phone: string,
  password: string,
  role: "staff" | "admin",
): Promise<Result> {
  await requireRole("admin");

  if (name.trim().length < 2) return { error: "invalid_name" };
  if (!isValidPhone(phone)) return { error: "invalid_phone" };
  if (password.length < 8) return { error: "short_password" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "session_expired" };

  const { error, network } = await callUsersFunction(
    { action: "create", name, phone, password, role },
    token,
  );
  if (network) return { error: "network" };
  if (error) return { error: error.toLowerCase().includes("already") ? "taken" : "create_failed" };

  revalidatePath("/admin");
  return { created: true };
}

// Password resets. Approving mints a six digit code the admin reads out to the
// person — that spoken hand-off is what ties the request to a real human, so
// the code is shown only here, to admins.
export async function approveReset(requestId: string): Promise<Result> {
  await requireRole("admin");
  const supabase = await createClient();

  const { error } = await supabase.rpc("approve_password_reset", { p_id: requestId });
  if (error) return { error: "reset_failed" };

  revalidatePath("/admin");
  return {};
}

export async function denyReset(requestId: string): Promise<Result> {
  await requireRole("admin");
  const supabase = await createClient();

  const { error } = await supabase.rpc("deny_password_reset", { p_id: requestId });
  if (error) return { error: "reset_failed" };

  revalidatePath("/admin");
  return {};
}

// Hard delete. Cascades take the person's orders, bans and pick rules with
// them — deactivate is the option that keeps the history. The edge function
// re-checks that the caller is an active admin and refuses self-deletes.
export async function deleteUser(userId: string): Promise<Result> {
  const admin = await requireRole("admin");
  if (userId === admin.id) return { error: "self_delete" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "session_expired" };

  const { error, network } = await callUsersFunction({ action: "delete", userId }, token);
  if (network) return { error: "network" };
  if (error) {
    const message = error.toLowerCase();
    if (message.includes("your own")) return { error: "self_delete" };
    return { error: "delete_failed" };
  }

  revalidatePath("/admin");
  return {};
}

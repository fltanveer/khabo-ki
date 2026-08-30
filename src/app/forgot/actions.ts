"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { callUsersFunction } from "@/lib/users-api";
import type { ActionResult } from "@/lib/errors";

// Asking is deliberately quiet: the RPC returns nothing whether or not the
// number has an account, so a stranger can't use this to find out who works
// here. The person is told to go ask their admin either way.
export async function requestReset(phone: string): Promise<ActionResult> {
  if (!isValidPhone(phone)) return { error: "invalid_phone" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_password_reset", {
    p_phone: normalizePhone(phone),
  });

  if (error) return { error: "reset_failed" };
  return {};
}

// The code the admin read out is what proves this is the right person. The
// edge function does the checking — it holds the service-role key.
export async function resetPassword(
  phone: string,
  code: string,
  password: string,
): Promise<ActionResult> {
  if (!isValidPhone(phone)) return { error: "invalid_phone" };
  if (!/^\d{6}$/.test(code.trim())) return { error: "reset_refused" };
  if (password.length < 8) return { error: "short_password" };

  const { error, network } = await callUsersFunction({
    action: "reset_password",
    phone: normalizePhone(phone),
    code: code.trim(),
    password,
  });

  if (!error) return {};
  if (network) return { error: "network" };

  const message = error.toLowerCase();
  if (message.includes("expired")) return { error: "reset_expired" };
  if (message.includes("too many")) return { error: "reset_locked" };
  if (message.includes("no approved") || message.includes("code")) {
    return { error: "reset_refused" };
  }
  return { error: "reset_failed" };
}

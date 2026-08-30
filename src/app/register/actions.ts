"use server";

import { isValidPhone } from "@/lib/phone";
import { callUsersFunction } from "@/lib/users-api";
import type { ActionResult } from "@/lib/errors";

// The role is never read from the request — the edge function pins
// self-registration to 'employee', and the profiles trigger parks the new
// account in 'pending' until an admin approves it.
export async function registerEmployee(
  name: string,
  phone: string,
  password: string,
): Promise<ActionResult> {
  if (name.trim().length < 2) return { error: "invalid_name" };
  if (!isValidPhone(phone)) return { error: "invalid_phone" };
  if (password.length < 8) return { error: "short_password" };

  const { error, network } = await callUsersFunction({
    action: "register",
    name,
    phone,
    password,
  });
  if (!error) return {};

  // Only say the number is taken when the function actually said so. Anything
  // else — an auth outage, a deploy in flight, a dropped connection — is not
  // evidence about this phone number, and telling someone they're already
  // registered when they aren't sends them off to chase a reset that no
  // account needs.
  if (network) return { error: "network" };
  return { error: error.toLowerCase().includes("already") ? "taken" : "create_failed" };
}

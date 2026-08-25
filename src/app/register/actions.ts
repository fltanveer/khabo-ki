"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isValidPhone, normalizePhone, phoneToEmail } from "@/lib/phone";

// Self-registration runs server-side with the service-role key rather than a
// browser signUp, so the project needs no "confirm email" toggle for the
// synthetic phone addresses. The role is pinned to 'employee' here — it is
// never taken from the request — and the DB trigger puts the profile in
// 'pending' until an admin approves it.
export async function registerEmployee(
  name: string,
  phone: string,
  password: string,
): Promise<{ error?: string }> {
  const cleanName = name.trim();
  const cleanPhone = normalizePhone(phone);

  if (cleanName.length < 2 || cleanName.length > 80) return { error: "Enter your full name." };
  if (!isValidPhone(phone)) return { error: "Enter a valid phone number." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Registration isn't configured on the server yet." };
  }

  const { error } = await admin.auth.admin.createUser({
    email: phoneToEmail(cleanPhone),
    password,
    email_confirm: true,
    user_metadata: { name: cleanName, phone: cleanPhone, role: "employee" },
  });

  if (error) {
    return {
      error: error.message.toLowerCase().includes("already")
        ? "That phone number is already registered."
        : "Couldn't create the account. Try again.",
    };
  }

  return {};
}

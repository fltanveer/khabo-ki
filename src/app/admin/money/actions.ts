"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { ActionResult } from "@/lib/errors";

export async function confirmMealPayment(paymentId: string): Promise<ActionResult> {
  const admin = await requireRole("admin");
  const supabase = await createClient();

  const { error } = await supabase
    .from("payments")
    .update({ confirmed_at: new Date().toISOString(), confirmed_by: admin.id })
    .eq("id", paymentId);

  if (error) return { error: "pay_failed" };

  revalidatePath("/admin/money");
  revalidatePath("/employee/money");
  return {};
}

// Cash handed over in person: the admin was there, so it is recorded and
// confirmed in one step rather than waiting on the payer to file a claim.
export async function recordCashReceived(
  employeeId: string,
  month: string,
  amount: number,
): Promise<ActionResult> {
  const admin = await requireRole("admin");
  const supabase = await createClient();

  const value = Math.trunc(amount);
  if (!Number.isFinite(value) || value <= 0) return { error: "invalid_amount" };
  if (!/^\d{4}-\d{2}-01$/.test(month)) return { error: "pay_failed" };
  if (employeeId === admin.id) return { error: "pay_failed" };

  const now = new Date().toISOString();
  const { error } = await supabase.from("payments").insert({
    payer_id: employeeId,
    payee_id: admin.id,
    amount_bdt: value,
    method: "cash",
    meal_month: month,
    claimed_at: now,
    confirmed_at: now,
    confirmed_by: admin.id,
  });

  if (error) return { error: "pay_failed" };

  revalidatePath("/admin/money");
  revalidatePath("/employee/money");
  return {};
}

// Only ever affects meals ordered from now on — every existing order carries
// the price it was placed at.
export async function setMealPrice(price: number): Promise<ActionResult> {
  const admin = await requireRole("admin");
  const supabase = await createClient();

  const value = Math.trunc(price);
  if (!Number.isFinite(value) || value <= 0) return { error: "invalid_amount" };

  const { error } = await supabase
    .from("app_settings")
    .update({ meal_price_bdt: value, updated_at: new Date().toISOString(), updated_by: admin.id })
    .eq("id", true);

  if (error) return { error: "generic" };

  revalidatePath("/admin/money");
  return {};
}

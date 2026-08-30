"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { ActionResult } from "@/lib/errors";

// The app never moves money. It records that someone says they handed it over,
// and later that the person collecting says it arrived. Both halves matter —
// a self-declared payment nobody confirmed settles no argument.
export async function recordMealPayment(
  month: string,
  amount: number,
  method: "cash" | "qr",
  note: string,
): Promise<ActionResult> {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const value = Math.trunc(amount);
  if (!Number.isFinite(value) || value <= 0) return { error: "invalid_amount" };
  if (!/^\d{4}-\d{2}-01$/.test(month)) return { error: "pay_failed" };

  const { data: admin } = await supabase
    .from("people")
    .select("id")
    .eq("role", "admin")
    .order("name")
    .limit(1)
    .maybeSingle();

  if (!admin) return { error: "no_admin" };

  const { error } = await supabase.from("payments").insert({
    payer_id: profile.id,
    payee_id: admin.id,
    amount_bdt: value,
    method,
    meal_month: month,
    note: note.trim().slice(0, 200) || null,
  });

  if (error) return { error: "pay_failed" };

  revalidatePath("/employee/money");
  return {};
}

export async function withdrawPayment(paymentId: string): Promise<ActionResult> {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  // The RLS policy already refuses once it is confirmed; this keeps the intent
  // visible at the call site too.
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId)
    .eq("payer_id", profile.id)
    .is("confirmed_at", null);

  if (error) return { error: "pay_failed" };

  revalidatePath("/employee/money");
  revalidatePath("/employee/events");
  return {};
}

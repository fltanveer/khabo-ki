"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import type { ActionResult } from "@/lib/errors";

export async function savePaymentDetails(input: {
  provider: string;
  number: string;
  qrImage: string | null;
}): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || profile.status !== "active") return { error: "session_expired" };

  const supabase = await createClient();
  const provider = ["bkash", "nagad", "rocket", "other"].includes(input.provider)
    ? input.provider
    : null;
  const number = input.number.replace(/[^\d+]/g, "").slice(0, 20);

  const { error } = await supabase.from("payment_details").upsert(
    {
      employee_id: profile.id,
      provider,
      number: number.length >= 6 ? number : null,
      qr_image: input.qrImage,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "employee_id" },
  );

  if (error) return { error: "generic" };

  revalidatePath("/settings/payment");
  revalidatePath("/employee/money");
  revalidatePath("/employee/events");
  return {};
}

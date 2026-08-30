"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { ActionResult } from "@/lib/errors";
import type { Rsvp } from "@/lib/types";

function touch(eventId?: string) {
  revalidatePath("/employee");
  revalidatePath("/employee/events");
  revalidatePath("/employee/money");
  if (eventId) revalidatePath(`/employee/events/${eventId}`);
}

export async function announceEvent(input: {
  title: string;
  details: string;
  eventAt: string;
  costMode: "treat" | "shared";
  total: number | null;
  collectorId: string;
}): Promise<ActionResult & { id?: string }> {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const title = input.title.trim();
  if (title.length < 2) return { error: "invalid_title" };
  if (!input.eventAt || Number.isNaN(Date.parse(input.eventAt))) return { error: "invalid_date" };

  const shared = input.costMode === "shared";
  const total = shared ? Math.trunc(input.total ?? 0) : null;
  if (shared && (!total || total <= 0)) return { error: "invalid_total" };

  const { data, error } = await supabase
    .from("events")
    .insert({
      created_by: profile.id,
      collector_id: input.collectorId || profile.id,
      title: title.slice(0, 120),
      details: input.details.trim().slice(0, 2000) || null,
      event_at: new Date(input.eventAt).toISOString(),
      cost_mode: input.costMode,
      total_amount_bdt: total,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "event_failed" };

  touch(data.id);
  return { id: data.id };
}

export async function setRsvp(eventId: string, rsvp: Rsvp): Promise<ActionResult> {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const { error } = await supabase
    .from("event_participants")
    .update({ rsvp, responded_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("employee_id", profile.id);

  if (error) return { error: "event_failed" };

  touch(eventId);
  return {};
}

// Naming your own amount takes you out of the even split; the leftover
// redivides among everyone who hasn't. Passing null puts you back in.
export async function setCustomAmount(
  eventId: string,
  amount: number | null,
): Promise<ActionResult> {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const value = amount === null ? null : Math.trunc(amount);
  if (value !== null && (!Number.isFinite(value) || value < 0)) {
    return { error: "invalid_amount" };
  }

  const { error } = await supabase
    .from("event_participants")
    .update({ custom_amount_bdt: value })
    .eq("event_id", eventId)
    .eq("employee_id", profile.id);

  if (error) return { error: "event_failed" };

  touch(eventId);
  return {};
}

export async function setEventStatus(
  eventId: string,
  status: "announced" | "settled" | "cancelled",
): Promise<ActionResult> {
  await requireRole("employee", "admin");
  const supabase = await createClient();

  // RLS lets only the announcer or an admin through.
  const { error } = await supabase.from("events").update({ status }).eq("id", eventId);
  if (error) return { error: "event_failed" };

  touch(eventId);
  return {};
}

export async function payEventShare(
  eventId: string,
  amount: number,
  method: "cash" | "qr",
  note: string,
): Promise<ActionResult> {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const value = Math.trunc(amount);
  if (!Number.isFinite(value) || value <= 0) return { error: "invalid_amount" };

  const { data: event } = await supabase
    .from("events")
    .select("collector_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return { error: "event_failed" };
  if (event.collector_id === profile.id) return { error: "pay_failed" };

  const { error } = await supabase.from("payments").insert({
    payer_id: profile.id,
    payee_id: event.collector_id,
    amount_bdt: value,
    method,
    event_id: eventId,
    note: note.trim().slice(0, 200) || null,
  });

  if (error) return { error: "pay_failed" };

  touch(eventId);
  return {};
}

// Only the person the money was sent to can say it arrived — the RLS update
// policy is keyed on payee_id, so a payer cannot self-confirm.
export async function confirmPayment(paymentId: string): Promise<ActionResult> {
  const profile = await requireRole("employee", "admin", "staff");
  const supabase = await createClient();

  const { error } = await supabase
    .from("payments")
    .update({ confirmed_at: new Date().toISOString(), confirmed_by: profile.id })
    .eq("id", paymentId);

  if (error) return { error: "pay_failed" };

  touch();
  revalidatePath("/admin/money");
  return {};
}

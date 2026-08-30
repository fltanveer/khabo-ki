import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/date";
import { EventDetail } from "./EventDetail";
import type { PaymentDetails } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole("employee");
  const { lang } = await getI18n();
  const supabase = await createClient();
  const { id } = await params;

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, created_by, collector_id, title, details, event_at, cost_mode, total_amount_bdt, status",
    )
    .eq("id", id)
    .maybeSingle();

  if (!event) notFound();

  const [{ data: participants }, { data: shares }, { data: payments }, { data: collector }] =
    await Promise.all([
      supabase
        .from("event_participants")
        .select("employee_id, rsvp, custom_amount_bdt")
        .eq("event_id", id),
      supabase.from("event_shares").select("employee_id, share_bdt").eq("event_id", id),
      supabase
        .from("payments")
        .select("id, payer_id, amount_bdt, method, note, claimed_at, confirmed_at")
        .eq("event_id", id),
      // Names come from the directory view — employees can't read each other's
      // profile rows, and only need a name here anyway.
      supabase.from("people").select("id, name"),
    ]);

  const names = new Map(((collector ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));

  const { data: collectorPayment } = await supabase
    .from("payment_details")
    .select("employee_id, provider, number, qr_image")
    .eq("employee_id", event.collector_id)
    .maybeSingle();

  const shareMap = new Map((shares ?? []).map((s) => [s.employee_id, s.share_bdt]));

  const rows = ((participants ?? []) as unknown as {
    employee_id: string;
    rsvp: "pending" | "in" | "out";
    custom_amount_bdt: number | null;
  }[])
    .map((p) => ({
      id: p.employee_id,
      name: names.get(p.employee_id) ?? "—",
      rsvp: p.rsvp,
      custom: p.custom_amount_bdt,
      share: shareMap.get(p.employee_id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader title={event.title} subtitle={formatDateTime(event.event_at, lang)} />
      {event.details && (
        <p className="mb-5 whitespace-pre-line text-sm leading-relaxed text-muted">
          {event.details}
        </p>
      )}

      <EventDetail
        event={event}
        me={profile.id}
        participants={rows}
        payments={payments ?? []}
        collector={{
          id: event.collector_id,
          name: names.get(event.collector_id) ?? "—",
        }}
        collectorPayment={(collectorPayment as PaymentDetails | null) ?? null}
      />

    </>
  );
}

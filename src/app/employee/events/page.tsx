import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { fill } from "@/lib/i18n";
import { formatDateTime } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { Badge, Empty, List, PageHeader, Row, Section } from "@/components/ui";
import { AnnounceForm } from "./AnnounceForm";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  title: string;
  event_at: string;
  cost_mode: "treat" | "shared";
  total_amount_bdt: number | null;
  status: "announced" | "settled" | "cancelled";
  created_by: string;
};

export default async function EventsPage() {
  const profile = await requireRole("employee");
  const { lang, t } = await getI18n();
  const supabase = await createClient();

  const [{ data: eventRows }, { data: people }, { data: myShares }] = await Promise.all([
    supabase
      .from("events")
      .select("id, created_by, title, event_at, cost_mode, total_amount_bdt, status")
      .order("event_at", { ascending: false })
      .limit(60),
    supabase.from("people").select("id, name").order("name"),
    supabase.from("event_shares").select("event_id, share_bdt").eq("employee_id", profile.id),
  ]);

  const events = (eventRows ?? []) as unknown as EventRow[];
  const names = new Map((people ?? []).map((p) => [p.id, p.name]));
  const shares = new Map((myShares ?? []).map((s) => [s.event_id, s.share_bdt]));
  const now = Date.parse(new Date().toISOString());
  const upcoming = events.filter(
    (e) => e.status !== "cancelled" && Date.parse(e.event_at) >= now,
  );
  const past = events.filter((e) => e.status === "cancelled" || Date.parse(e.event_at) < now);

  function eventRow(event: EventRow) {
    const share = shares.get(event.id) ?? 0;
    return (
      <Row key={event.id}>
        <Link href={`/employee/events/${event.id}`} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{event.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {formatDateTime(event.event_at, lang)}
            {names.has(event.created_by)
              ? ` · ${fill(t.events.byLine, { name: names.get(event.created_by)! }, lang)}`
              : ""}
          </p>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {event.status === "cancelled" && <Badge tone="bad">{t.events.cancelled}</Badge>}
          {event.status === "settled" && <Badge tone="good">{t.events.settledLabel}</Badge>}
          {event.cost_mode === "treat" ? (
            <Badge tone="brand">{t.events.treat}</Badge>
          ) : share > 0 ? (
            <Badge tone="warn">{formatMoney(share, lang)}</Badge>
          ) : (
            <Badge>{formatMoney(event.total_amount_bdt ?? 0, lang)}</Badge>
          )}
        </div>
      </Row>
    );
  }

  return (
    <>
      <PageHeader title={t.events.title} subtitle={t.events.subtitle} />

      <AnnounceForm people={people ?? []} selfId={profile.id} />

      <Section title={t.events.upcoming}>
        {upcoming.length === 0 ? (
          <Empty>{t.events.none}</Empty>
        ) : (
          <List>{upcoming.map(eventRow)}</List>
        )}
      </Section>

      {past.length > 0 && (
        <Section title={t.events.past}>
          <List>{past.map(eventRow)}</List>
        </Section>
      )}
    </>
  );
}

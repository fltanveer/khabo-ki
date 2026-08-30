import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { fill, itemName } from "@/lib/i18n";
import { formatDate } from "@/lib/date";
import { formatMoney, monthKey, monthLabel, shiftMonth } from "@/lib/money";
import { Badge, Card, Empty, List, PageHeader, Row, Section } from "@/components/ui";
import { PayPanel } from "./PayPanel";
import type { PaymentDetails } from "@/lib/types";

export const dynamic = "force-dynamic";

type DayRow = { date: string; label: string; amount: number; guest: boolean };

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await requireRole("employee");
  const { lang, t } = await getI18n();
  const supabase = await createClient();

  const { month: requested } = await searchParams;
  const month = /^\d{4}-\d{2}-01$/.test(requested ?? "") ? requested! : monthKey();
  const monthEnd = shiftMonth(month, 1);

  const [
    { data: bill },
    { data: paymentRows },
    { data: admins },
    { data: orderRows },
    { data: guestRows },
    { data: shareRows },
  ] = await Promise.all([
    supabase
      .from("meal_bills")
      .select("own_meals, guest_meals, amount_bdt")
      .eq("employee_id", profile.id)
      .eq("month", month)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("id, amount_bdt, method, note, claimed_at, confirmed_at")
      .eq("payer_id", profile.id)
      .eq("meal_month", month)
      .order("claimed_at", { ascending: false }),
    // `people` rather than `profiles`: an employee cannot read another
    // person's profile row, and doesn't need to — a name is enough to know
    // who to hand the money to.
    supabase.from("people").select("id, name").eq("role", "admin").order("name").limit(1),
    supabase
      .from("orders")
      .select("id, unit_price_bdt, items(name, name_bn), daily_menus!inner(menu_date)")
      .eq("employee_id", profile.id)
      .gte("daily_menus.menu_date", month)
      .lt("daily_menus.menu_date", monthEnd),
    supabase
      .from("guest_meals")
      .select("id, quantity, unit_price_bdt, items(name, name_bn), daily_menus!inner(menu_date)")
      .eq("host_id", profile.id)
      .gte("daily_menus.menu_date", month)
      .lt("daily_menus.menu_date", monthEnd),
    supabase
      .from("event_shares")
      .select("event_id, share_bdt, events!inner(id, title, status, event_at)")
      .eq("employee_id", profile.id)
      .gt("share_bdt", 0)
      .neq("events.status", "cancelled"),
  ]);

  const admin = admins?.[0] ?? null;
  let adminPayment: PaymentDetails | null = null;
  if (admin) {
    const { data } = await supabase
      .from("payment_details")
      .select("employee_id, provider, number, qr_image")
      .eq("employee_id", admin.id)
      .maybeSingle();
    adminPayment = (data as PaymentDetails | null) ?? null;
  }

  const payments = paymentRows ?? [];
  const billed = bill?.amount_bdt ?? 0;
  const paid = payments
    .filter((p) => p.confirmed_at)
    .reduce((sum, p) => sum + p.amount_bdt, 0);
  const pendingClaims = payments
    .filter((p) => !p.confirmed_at)
    .reduce((sum, p) => sum + p.amount_bdt, 0);
  const outstanding = Math.max(billed - paid, 0);

  const days: DayRow[] = [
    ...((orderRows ?? []) as unknown as {
      id: string;
      unit_price_bdt: number;
      items: { name: string; name_bn: string | null } | null;
      daily_menus: { menu_date: string };
    }[]).map((row) => ({
      date: row.daily_menus.menu_date,
      label: row.items ? itemName(row.items, lang) : "—",
      amount: row.unit_price_bdt,
      guest: false,
    })),
    ...((guestRows ?? []) as unknown as {
      id: string;
      quantity: number;
      unit_price_bdt: number;
      items: { name: string; name_bn: string | null } | null;
      daily_menus: { menu_date: string };
    }[]).map((row) => ({
      date: row.daily_menus.menu_date,
      label: `${row.items ? itemName(row.items, lang) : "—"} × ${row.quantity}`,
      amount: row.quantity * row.unit_price_bdt,
      guest: true,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const shares = (shareRows ?? []) as unknown as {
    event_id: string;
    share_bdt: number;
    events: { id: string; title: string; status: string; event_at: string };
  }[];

  const monthNav = (
    <div className="flex items-center gap-1">
      <Link
        href={`/employee/money?month=${shiftMonth(month, -1)}`}
        className="rounded-lg border border-line-strong px-2.5 py-1.5 text-sm text-muted hover:bg-raised hover:text-ink"
      >
        ‹
      </Link>
      <Link
        href={`/employee/money?month=${shiftMonth(month, 1)}`}
        className="rounded-lg border border-line-strong px-2.5 py-1.5 text-sm text-muted hover:bg-raised hover:text-ink"
      >
        ›
      </Link>
    </div>
  );

  return (
    <>
      <PageHeader title={t.money.title} subtitle={monthLabel(month, lang)} action={monthNav} />

      <Card className="mb-5">
        <div className="grid grid-cols-2 gap-4">
          <Figure label={t.money.ownMeals} value={String(bill?.own_meals ?? 0)} lang={lang} />
          <Figure label={t.money.guestMeals} value={String(bill?.guest_meals ?? 0)} lang={lang} />
        </div>

        <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <LineItem label={t.money.billed} value={formatMoney(billed, lang)} />
          <LineItem label={t.money.paid} value={formatMoney(paid, lang)} muted />
          {pendingClaims > 0 && (
            <LineItem
              label={t.money.claimed}
              value={formatMoney(pendingClaims, lang)}
              muted
            />
          )}
          <div className="flex items-center justify-between border-t border-line pt-2">
            <span className="font-medium">{t.money.outstanding}</span>
            <span
              className={`text-lg font-semibold tabular-nums ${
                outstanding > 0 ? "text-bad" : "text-good"
              }`}
            >
              {outstanding > 0 ? formatMoney(outstanding, lang) : t.money.settled}
            </span>
          </div>
        </div>
      </Card>

      <PayPanel
        month={month}
        outstanding={outstanding}
        admin={admin}
        adminPayment={adminPayment}
        payments={payments}
      />

      {shares.length > 0 && (
        <Section title={t.money.events}>
          <List>
            {shares.map((share) => (
              <Row key={share.event_id}>
                <Link
                  href={`/employee/events/${share.event_id}`}
                  className="min-w-0 flex-1 text-sm font-medium underline-offset-2 hover:underline"
                >
                  {share.events.title}
                </Link>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatMoney(share.share_bdt, lang)}
                </span>
              </Row>
            ))}
          </List>
        </Section>
      )}

      <Section title={t.money.perDay}>
        {days.length === 0 ? (
          <Empty>{t.money.noHistory}</Empty>
        ) : (
          <List>
            {days.map((day, index) => (
              <Row key={`${day.date}-${index}`}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{day.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{formatDate(day.date, lang)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {day.guest && <Badge>{t.guests.title}</Badge>}
                  <span className="text-sm tabular-nums">{formatMoney(day.amount, lang)}</span>
                </div>
              </Row>
            ))}
          </List>
        )}
      </Section>

      <p className="mt-6 text-sm leading-relaxed text-muted">
        {fill(t.money.howToPay, {}, lang)}
      </p>
    </>
  );
}

function Figure({ label, value, lang }: { label: string; value: string; lang: "en" | "bn" }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-GB").format(Number(value))}
      </p>
    </div>
  );
}

function LineItem({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted" : ""}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

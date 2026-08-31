import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney, monthKey, monthLabel, shiftMonth } from "@/lib/money";
import { PageHeader } from "@/components/ui";
import { shownName } from "@/lib/names";
import { Settlement, type SettlementRow } from "./Settlement";

export const dynamic = "force-dynamic";

export default async function AdminMoney({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const admin = await requireRole("admin");
  const { lang, t } = await getI18n();
  const supabase = await createClient();

  const { month: requested } = await searchParams;
  const month = /^\d{4}-\d{2}-01$/.test(requested ?? "") ? requested! : monthKey();

  const [{ data: bills }, { data: people }, { data: paymentRows }, { data: settings }] =
    await Promise.all([
      supabase
        .from("meal_bills")
        .select("employee_id, own_meals, guest_meals, amount_bdt")
        .eq("month", month),
      supabase.from("profiles").select("id, name, display_name, phone, status").order("name"),
      supabase
        .from("payments")
        .select("id, payer_id, amount_bdt, method, note, claimed_at, confirmed_at")
        .eq("meal_month", month),
      supabase.from("app_settings").select("meal_price_bdt").maybeSingle(),
    ]);

  const byPerson = new Map((people ?? []).map((p) => [p.id, p]));
  const payments = paymentRows ?? [];

  const rows: SettlementRow[] = (bills ?? [])
    .map((bill) => {
      const person = byPerson.get(bill.employee_id);
      const theirs = payments.filter((p) => p.payer_id === bill.employee_id);
      const paid = theirs.filter((p) => p.confirmed_at).reduce((s, p) => s + p.amount_bdt, 0);
      const claimed = theirs
        .filter((p) => !p.confirmed_at)
        .reduce((s, p) => s + p.amount_bdt, 0);

      return {
        employeeId: bill.employee_id,
        name: person ? shownName(person) : "—",
        phone: person?.phone ?? "",
        ownMeals: bill.own_meals,
        guestMeals: bill.guest_meals,
        billed: bill.amount_bdt,
        paid,
        claimed,
        claims: theirs
          .filter((p) => !p.confirmed_at)
          .map((p) => ({
            id: p.id,
            amount_bdt: p.amount_bdt,
            method: p.method,
            claimed_at: p.claimed_at,
            note: p.note,
          })),
      };
    })
    .sort((a, b) => b.billed - a.billed || a.name.localeCompare(b.name));

  const totals = rows.reduce(
    (acc, row) => ({
      billed: acc.billed + row.billed,
      paid: acc.paid + row.paid,
      claimed: acc.claimed + row.claimed,
    }),
    { billed: 0, paid: 0, claimed: 0 },
  );

  const monthNav = (
    <div className="flex items-center gap-1">
      <Link
        href={`/admin/money?month=${shiftMonth(month, -1)}`}
        className="rounded-lg border border-line-strong px-2.5 py-1.5 text-sm text-muted hover:bg-raised hover:text-ink"
      >
        ‹
      </Link>
      <Link
        href={`/admin/money?month=${shiftMonth(month, 1)}`}
        className="rounded-lg border border-line-strong px-2.5 py-1.5 text-sm text-muted hover:bg-raised hover:text-ink"
      >
        ›
      </Link>
    </div>
  );

  return (
    <>
      <PageHeader
        title={t.settlement.title}
        subtitle={`${monthLabel(month, lang)} · ${formatMoney(totals.billed, lang)}`}
        action={monthNav}
      />
      <Settlement
        month={month}
        rows={rows}
        totals={totals}
        adminId={admin.id}
        mealPrice={settings?.meal_price_bdt ?? 75}
      />
    </>
  );
}

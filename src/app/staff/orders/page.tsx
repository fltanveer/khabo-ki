import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime, isPast, today } from "@/lib/date";
import { getI18n } from "@/lib/i18n/server";
import { fill, formatNumber, itemName } from "@/lib/i18n";
import { Badge, Card, Empty, List, PageHeader, Row, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  source: "manual" | "auto";
  employee_id: string;
  items: { name: string; name_bn: string | null } | null;
  profiles: { name: string; phone: string } | null;
};

export default async function StaffOrders({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireRole("staff", "admin");
  const { lang, t } = await getI18n();
  const supabase = await createClient();
  const { date } = await searchParams;
  const menuDate = date ?? today();

  const { data: menu } = await supabase
    .from("daily_menus")
    .select("id, menu_date, cutoff_time, status, locked_at")
    .eq("menu_date", menuDate)
    .maybeSingle();

  const dateForm = (
    <form className="flex items-end gap-2">
      <input
        type="date"
        name="date"
        defaultValue={menuDate}
        className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
      />
      <button
        type="submit"
        className="min-h-10 rounded-xl border border-line-strong px-3 text-sm font-medium"
      >
        {t.staff.go}
      </button>
    </form>
  );

  if (!menu) {
    return (
      <>
        <PageHeader
          title={t.staff.ordersTitle}
          subtitle={formatDate(menuDate, lang)}
          action={dateForm}
        />
        <Empty>{t.staff.noMenuThatDay}</Empty>
      </>
    );
  }

  const [{ data: orderData }, { data: employees }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, source, employee_id, items(name, name_bn), profiles(name, phone)")
      .eq("daily_menu_id", menu.id),
    supabase
      .from("profiles")
      .select("id, name, phone")
      .eq("role", "employee")
      .eq("status", "active")
      .order("name"),
  ]);

  const orders = (orderData ?? []) as unknown as OrderRow[];
  const closed = Boolean(menu.locked_at) || isPast(menu.cutoff_time);
  const cutoff = formatTime(menu.cutoff_time, lang);

  const counts = new Map<string, number>();
  for (const order of orders) {
    const name = order.items ? itemName(order.items, lang) : "—";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const tally = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const ordered = new Set(orders.map((order) => order.employee_id));
  const missing = (employees ?? []).filter((employee) => !ordered.has(employee.id));

  return (
    <>
      <PageHeader
        title={t.staff.ordersTitle}
        subtitle={
          <>
            {formatDate(menuDate, lang)} ·{" "}
            {closed ? t.staff.final : fill(t.staff.stillOpen, { time: cutoff }, lang)}
          </>
        }
        action={dateForm}
      />

      {!closed && (
        <Card className="mb-5 border-warn/40 bg-warn-soft">
          <p className="text-sm">{fill(t.staff.stillOpenNote, { time: cutoff }, lang)}</p>
        </Card>
      )}

      <Section
        title={t.staff.counts}
        aside={<Badge tone="brand">{formatNumber(orders.length, lang)}</Badge>}
      >
        {tally.length === 0 ? (
          <Empty>{t.staff.nobodyYet}</Empty>
        ) : (
          <List>
            {tally.map(([name, count]) => (
              <Row key={name}>
                <span className="text-[0.95rem] font-medium">{name}</span>
                <span className="text-xl font-semibold tabular-nums">
                  {formatNumber(count, lang)}
                </span>
              </Row>
            ))}
          </List>
        )}
      </Section>

      <Section title={t.staff.whoOrdered}>
        {orders.length === 0 ? (
          <Empty>{t.staff.nobodyYet}</Empty>
        ) : (
          <List>
            {orders
              .slice()
              .sort((a, b) => (a.profiles?.name ?? "").localeCompare(b.profiles?.name ?? ""))
              .map((order) => (
                <Row key={order.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{order.profiles?.name ?? "—"}</p>
                    <p className="mt-0.5 text-xs text-muted">{order.profiles?.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {order.items ? itemName(order.items, lang) : "—"}
                    </span>
                    {order.source === "auto" && <Badge>{t.employee.auto}</Badge>}
                  </div>
                </Row>
              ))}
          </List>
        )}
      </Section>

      {missing.length > 0 && (
        <Section
          title={t.staff.noPick}
          aside={<Badge tone="warn">{formatNumber(missing.length, lang)}</Badge>}
          description={closed ? t.staff.nothingFor : t.staff.nudge}
        >
          <List>
            {missing.map((employee) => (
              <Row key={employee.id}>
                <span className="truncate text-sm font-medium">{employee.name}</span>
                <a
                  href={`tel:${employee.phone}`}
                  className="text-sm font-medium text-brand underline underline-offset-2"
                >
                  {employee.phone}
                </a>
              </Row>
            ))}
          </List>
        </Section>
      )}

      <p className="mt-6 text-sm text-muted">{t.staff.askAdmin}</p>
    </>
  );
}

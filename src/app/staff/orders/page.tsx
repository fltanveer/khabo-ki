import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime, isPast, today } from "@/lib/date";
import { getI18n } from "@/lib/i18n/server";
import { fill, formatNumber, itemName } from "@/lib/i18n";
import { Badge, Card, Empty, List, PageHeader, Row, Section } from "@/components/ui";
import { shownName } from "@/lib/names";

export const dynamic = "force-dynamic";

type GuestRow = {
  id: string;
  quantity: number;
  guest_label: string | null;
  items: { name: string; name_bn: string | null } | null;
  profiles: { name: string; display_name: string | null } | null;
};

type OrderRow = {
  id: string;
  source: "manual" | "auto";
  employee_id: string;
  items: { name: string; name_bn: string | null } | null;
  profiles: { name: string; display_name: string | null; phone: string } | null;
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
        className="min-h-11 rounded-xl border border-line-strong px-3 text-sm font-medium sm:min-h-10"
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

  const [{ data: orderData }, { data: employees }, { data: guestData }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, source, employee_id, items(name, name_bn), profiles(name, display_name, phone)")
      .eq("daily_menu_id", menu.id),
    supabase
      .from("profiles")
      .select("id, name, display_name, phone")
      .eq("role", "employee")
      .eq("status", "active")
      .eq("is_test", false)
      .order("name"),
    supabase
      .from("guest_meals")
      .select("id, quantity, guest_label, items(name, name_bn), profiles(name, display_name)")
      .eq("daily_menu_id", menu.id),
  ]);

  const orders = (orderData ?? []) as unknown as OrderRow[];
  const closed = Boolean(menu.locked_at) || isPast(menu.cutoff_time);
  const cutoff = formatTime(menu.cutoff_time, lang);

  const guests = (guestData ?? []) as unknown as GuestRow[];
  const guestTotal = guests.reduce((sum, guest) => sum + guest.quantity, 0);

  // The kitchen gets one number per dish, and a guest eats exactly like anyone
  // else — so guests go into the count, with the split shown alongside so staff
  // can see where an unfamiliar head came from.
  const counts = new Map<string, { total: number; guest: number }>();
  const bump = (name: string, by: number, isGuest: boolean) => {
    const row = counts.get(name) ?? { total: 0, guest: 0 };
    row.total += by;
    if (isGuest) row.guest += by;
    counts.set(name, row);
  };

  for (const order of orders) {
    bump(order.items ? itemName(order.items, lang) : "—", 1, false);
  }
  for (const guest of guests) {
    bump(guest.items ? itemName(guest.items, lang) : "—", guest.quantity, true);
  }

  const tally = [...counts.entries()].sort(
    (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]),
  );
  const headcount = orders.length + guestTotal;

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
        aside={<Badge tone="brand">{formatNumber(headcount, lang)}</Badge>}
      >
        {tally.length === 0 ? (
          <Empty>{t.staff.nobodyYet}</Empty>
        ) : (
          <List>
            {tally.map(([name, count]) => (
              <Row key={name}>
                <div className="min-w-0">
                  <span className="text-[0.95rem] font-medium">{name}</span>
                  {count.guest > 0 && (
                    <p className="mt-0.5 text-xs text-muted">
                      {fill(t.staff.ofWhichGuest, { count: count.guest }, lang)}
                    </p>
                  )}
                </div>
                <span className="text-xl font-semibold tabular-nums">
                  {formatNumber(count.total, lang)}
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
              .sort((a, b) =>
                (a.profiles ? shownName(a.profiles) : "").localeCompare(
                  b.profiles ? shownName(b.profiles) : "",
                ),
              )
              .map((order) => (
                <Row key={order.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {order.profiles ? shownName(order.profiles) : "—"}
                    </p>
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

      {guests.length > 0 && (
        <Section
          title={t.guests.title}
          aside={<Badge tone="brand">{formatNumber(guestTotal, lang)}</Badge>}
        >
          <List>
            {guests.map((guest) => (
              <Row key={guest.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {guest.items ? itemName(guest.items, lang) : "—"}
                    {guest.quantity > 1 && (
                      <span className="text-muted"> × {formatNumber(guest.quantity, lang)}</span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {guest.profiles ? shownName(guest.profiles) : "—"}
                    {guest.guest_label ? ` · ${guest.guest_label}` : ""}
                  </p>
                </div>
              </Row>
            ))}
          </List>
        </Section>
      )}

      {missing.length > 0 && (
        <Section
          title={t.staff.noPick}
          aside={<Badge tone="warn">{formatNumber(missing.length, lang)}</Badge>}
          description={closed ? t.staff.nothingFor : t.staff.nudge}
        >
          <List>
            {missing.map((employee) => (
              <Row key={employee.id}>
                <span className="truncate text-sm font-medium">{shownName(employee)}</span>
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

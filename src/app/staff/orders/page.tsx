import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime, isPast, today } from "@/lib/date";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  source: "manual" | "auto";
  employee_id: string;
  items: { name: string } | null;
  profiles: { name: string; phone: string } | null;
};

export default async function StaffOrders({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireRole("staff", "admin");
  const supabase = await createClient();
  const { date } = await searchParams;
  const menuDate = date ?? today();

  const { data: menu } = await supabase
    .from("daily_menus")
    .select("id, menu_date, cutoff_time, status, locked_at")
    .eq("menu_date", menuDate)
    .maybeSingle();

  if (!menu) {
    return (
      <>
        <PageHeader title="Orders" subtitle={formatDate(menuDate)} />
        <Empty>No menu for that day.</Empty>
      </>
    );
  }

  const [{ data: orderData }, { data: employees }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, source, employee_id, items(name), profiles(name, phone)")
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

  const counts = new Map<string, number>();
  for (const order of orders) {
    const name = order.items?.name ?? "Removed item";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const tally = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const ordered = new Set(orders.map((order) => order.employee_id));
  const missing = (employees ?? []).filter((employee) => !ordered.has(employee.id));

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={
          <>
            {formatDate(menuDate)} ·{" "}
            {closed ? "final" : `still open until ${formatTime(menu.cutoff_time)}`}
          </>
        }
        action={
          <form className="flex items-end gap-2">
            <input
              type="date"
              name="date"
              defaultValue={menuDate}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg border border-line px-3 py-2 text-sm">
              Go
            </button>
          </form>
        }
      />

      {!closed && (
        <Card className="mb-5 border-warn/50 bg-warn/10">
          <p className="text-sm">
            Ordering is still open — these numbers can still change until{" "}
            {formatTime(menu.cutoff_time)}.
          </p>
        </Card>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">
          Counts to send the restaurant{" "}
          <span className="text-muted">({orders.length} total)</span>
        </h2>
        {tally.length === 0 ? (
          <Empty>Nobody has ordered yet.</Empty>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-line">
              {tally.map(([name, count]) => (
                <li key={name} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm">{name}</span>
                  <span className="text-lg font-semibold tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Who ordered what</h2>
        {orders.length === 0 ? (
          <Empty>Nothing yet.</Empty>
        ) : (
          <Card className="p-0">
            <ul className="divide-y divide-line">
              {orders
                .slice()
                .sort((a, b) => (a.profiles?.name ?? "").localeCompare(b.profiles?.name ?? ""))
                .map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{order.profiles?.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted">{order.profiles?.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{order.items?.name ?? "Removed item"}</span>
                      {order.source === "auto" && <Badge>auto</Badge>}
                    </div>
                  </li>
                ))}
            </ul>
          </Card>
        )}
      </section>

      {missing.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            No pick <span className="text-muted">({missing.length})</span>
          </h2>
          <Card className="p-0">
            <ul className="divide-y divide-line">
              {missing.map((employee) => (
                <li key={employee.id} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm">{employee.name}</span>
                  <a href={`tel:${employee.phone}`} className="text-sm text-brand underline">
                    {employee.phone}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
          <p className="mt-2 text-sm text-muted">
            {closed
              ? "Nothing was ordered for these people."
              : "Nudge them before cutoff or they get nothing."}
          </p>
        </section>
      )}

      <p className="mt-8 text-sm text-muted">
        Need a spreadsheet or an older range? Ask an admin — they can export the full history.
      </p>
    </>
  );
}

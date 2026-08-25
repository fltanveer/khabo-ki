import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchHistory, readFilters } from "@/lib/history";
import { formatDate } from "@/lib/date";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminHistory({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const filters = readFilters(params);

  const supabase = await createClient();
  const [rows, { data: employees }, { data: items }] = await Promise.all([
    fetchHistory(filters),
    supabase.from("profiles").select("id, name").eq("role", "employee").order("name"),
    supabase.from("items").select("id, name").order("name"),
  ]);

  const exportQuery = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  ).toString();

  const counts = new Map<string, number>();
  for (const row of rows) {
    const name = row.items?.name ?? "Removed item";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Order history"
        subtitle={`${rows.length} order${rows.length === 1 ? "" : "s"} matching these filters.`}
        action={
          <a
            href={`/admin/history/export${exportQuery ? `?${exportQuery}` : ""}`}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            Export CSV
          </a>
        }
      />

      <Card className="mb-6">
        <form className="grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">From</span>
            <input
              type="date"
              name="from"
              defaultValue={filters.from ?? ""}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">To</span>
            <input
              type="date"
              name="to"
              defaultValue={filters.to ?? ""}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Employee</span>
            <select
              name="employee"
              defaultValue={filters.employeeId ?? ""}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            >
              <option value="">Everyone</option>
              {(employees ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Item</span>
            <select
              name="item"
              defaultValue={filters.itemId ?? ""}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            >
              <option value="">Anything</option>
              {(items ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-4">
            <button
              type="submit"
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium"
            >
              Apply filters
            </button>
          </div>
        </form>
      </Card>

      {counts.size > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {[...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => (
              <Badge key={name}>
                {name}: {count}
              </Badge>
            ))}
        </div>
      )}

      {rows.length === 0 ? (
        <Empty>No orders match those filters.</Empty>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 font-medium">Item</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-5 py-3">
                      {row.daily_menus ? formatDate(row.daily_menus.menu_date) : "—"}
                    </td>
                    <td className="px-5 py-3">{row.profiles?.name ?? "Unknown"}</td>
                    <td className="px-5 py-3">{row.items?.name ?? "Removed item"}</td>
                    <td className="px-5 py-3 text-muted">{row.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

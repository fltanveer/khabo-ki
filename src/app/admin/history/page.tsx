import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchHistory, readFilters } from "@/lib/history";
import { formatDate } from "@/lib/date";
import { getI18n } from "@/lib/i18n/server";
import { fill, formatNumber, itemName } from "@/lib/i18n";
import { Badge, Card, Empty, List, PageHeader, Row } from "@/components/ui";

export const dynamic = "force-dynamic";

const FIELD = "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink";

export default async function AdminHistory({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("admin");
  const { lang, t } = await getI18n();
  const params = await searchParams;
  const filters = readFilters(params);

  const supabase = await createClient();
  const [rows, { data: employees }, { data: items }] = await Promise.all([
    fetchHistory(filters),
    supabase.from("profiles").select("id, name").eq("role", "employee").order("name"),
    supabase.from("items").select("id, name, name_bn").order("sort_order").order("name"),
  ]);

  const exportQuery = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  ).toString();

  const counts = new Map<string, number>();
  for (const row of rows) {
    const name = row.items ? itemName(row.items, lang) : "—";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title={t.admin.historyTitle}
        subtitle={fill(t.admin.historyCount, { count: rows.length }, lang)}
        action={
          <a
            href={`/admin/history/export${exportQuery ? `?${exportQuery}` : ""}`}
            className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-sm font-medium text-on-brand sm:min-h-10"
          >
            {t.admin.exportCsv}
          </a>
        }
      />

      <Card className="mb-5">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t.admin.from}</span>
            <input type="date" name="from" defaultValue={filters.from ?? ""} className={FIELD} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t.admin.to}</span>
            <input type="date" name="to" defaultValue={filters.to ?? ""} className={FIELD} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t.admin.employee}</span>
            <select name="employee" defaultValue={filters.employeeId ?? ""} className={FIELD}>
              <option value="">{t.admin.everyone}</option>
              {(employees ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">{t.admin.dish}</span>
            <select name="item" defaultValue={filters.itemId ?? ""} className={FIELD}>
              <option value="">{t.admin.anything}</option>
              {(items ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {itemName(item, lang)}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="min-h-11 w-full rounded-xl border border-line px-4 text-sm font-medium sm:min-h-10 sm:w-auto"
            >
              {t.admin.applyFilters}
            </button>
          </div>
        </form>
      </Card>

      {counts.size > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {[...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => (
              <Badge key={name} tone="brand">
                {name}: {formatNumber(count, lang)}
              </Badge>
            ))}
        </div>
      )}

      {rows.length === 0 ? (
        <Empty>{t.admin.noMatches}</Empty>
      ) : (
        <>
          {/* Cards on phones, a real table once there's width for it. */}
          <div className="lg:hidden">
            <List>
              {rows.map((row) => (
                <Row key={row.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.profiles?.name ?? "—"}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {row.daily_menus ? formatDate(row.daily_menus.menu_date, lang) : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{row.items ? itemName(row.items, lang) : "—"}</span>
                    {row.source === "auto" && <Badge>{t.employee.auto}</Badge>}
                  </div>
                </Row>
              ))}
            </List>
          </div>

          <Card padded={false} className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">{t.admin.date}</th>
                    <th className="px-5 py-3 font-medium">{t.admin.employee}</th>
                    <th className="px-5 py-3 font-medium">{t.admin.dish}</th>
                    <th className="px-5 py-3 font-medium">{t.admin.source}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap px-5 py-3">
                        {row.daily_menus ? formatDate(row.daily_menus.menu_date, lang) : "—"}
                      </td>
                      <td className="px-5 py-3">{row.profiles?.name ?? "—"}</td>
                      <td className="px-5 py-3">{row.items ? itemName(row.items, lang) : "—"}</td>
                      <td className="px-5 py-3 text-muted">{row.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

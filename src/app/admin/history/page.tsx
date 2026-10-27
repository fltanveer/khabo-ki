import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchHistory, readFilters } from "@/lib/history";
import { formatMoney } from "@/lib/money";
import { shownName } from "@/lib/names";
import { formatDate } from "@/lib/date";
import { getI18n } from "@/lib/i18n/server";
import { fill, formatNumber, itemName } from "@/lib/i18n";
import { Badge, Card, Empty, List, PageHeader, Row } from "@/components/ui";
import { SheetButton } from "@/components/SheetButton";

export const dynamic = "force-dynamic";

const FIELD =
  "min-h-12 w-full rounded-[1.125rem] border border-line-strong bg-surface px-4 py-3 text-ink outline-none focus:border-ink focus:ring-4 focus:ring-ink/10";

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
            className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-bg"
          >
            {t.admin.exportCsv}
          </a>
        }
      />

      <div className="mb-5">
      <SheetButton label={t.admin.filters} title={t.admin.filters}>
        <form className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">{t.admin.from}</span>
            <input type="date" name="from" defaultValue={filters.from ?? ""} className={FIELD} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">{t.admin.to}</span>
            <input type="date" name="to" defaultValue={filters.to ?? ""} className={FIELD} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">{t.admin.employee}</span>
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
            <span className="mb-2 block text-sm font-medium text-muted">{t.admin.dish}</span>
            <select name="item" defaultValue={filters.itemId ?? ""} className={FIELD}>
              <option value="">{t.admin.anything}</option>
              {(items ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {itemName(item, lang)}
                </option>
              ))}
            </select>
          </label>
          <div className="pt-1 sm:col-span-2">
            <button
              type="submit"
              className="min-h-12 w-full rounded-full bg-ink px-5 font-semibold text-bg"
            >
              {t.admin.applyFilters}
            </button>
          </div>
        </form>
      </SheetButton>
      </div>

      {counts.size > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {[...counts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => (
              <Badge key={name}>
                {name}: {formatNumber(count, lang)}
              </Badge>
            ))}
        </div>
      )}

      {rows.length === 0 ? (
        <Empty mood="sleepy">{t.admin.noMatches}</Empty>
      ) : (
        <>
          {/* Cards on phones, a real table once there's width for it. */}
          <div className="lg:hidden">
            <List>
              {rows.map((row) => (
                <Row key={row.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.profiles ? shownName(row.profiles) : "—"}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {row.daily_menus ? formatDate(row.daily_menus.menu_date, lang) : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{row.items ? itemName(row.items, lang) : "—"}</span>
                    <span className="text-sm tabular-nums text-muted">
                      {formatMoney(row.unit_price_bdt, lang)}
                    </span>
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
                    <th className="px-5 py-3 font-medium">{t.settlement.price}</th>
                    <th className="px-5 py-3 font-medium">{t.admin.source}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap px-5 py-3">
                        {row.daily_menus ? formatDate(row.daily_menus.menu_date, lang) : "—"}
                      </td>
                      <td className="px-5 py-3">{row.profiles ? shownName(row.profiles) : "—"}</td>
                      <td className="px-5 py-3">{row.items ? itemName(row.items, lang) : "—"}</td>
                      <td className="px-5 py-3 tabular-nums">
                        {formatMoney(row.unit_price_bdt, lang)}
                      </td>
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

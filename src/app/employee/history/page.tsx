import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/date";
import { getI18n } from "@/lib/i18n/server";
import { itemName } from "@/lib/i18n";
import { Badge, Empty, List, PageHeader, Row } from "@/components/ui";

export const dynamic = "force-dynamic";

type HistoryRow = {
  id: string;
  source: "manual" | "auto";
  items: { name: string; name_bn: string | null } | null;
  daily_menus: { menu_date: string } | null;
};

export default async function HistoryPage() {
  const profile = await requireRole("employee");
  const { lang, t } = await getI18n();
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select("id, source, items(name, name_bn), daily_menus(menu_date)")
    .eq("employee_id", profile.id)
    .order("picked_at", { ascending: false })
    .limit(120);

  const rows = (data ?? []) as unknown as HistoryRow[];

  return (
    <>
      <PageHeader title={t.employee.historyTitle} subtitle={t.employee.historySubtitle} />

      {rows.length === 0 ? (
        <Empty>{t.employee.noOrders}</Empty>
      ) : (
        <List>
          {rows.map((row) => (
            <Row key={row.id}>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {row.items ? itemName(row.items, lang) : "—"}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {row.daily_menus ? formatDate(row.daily_menus.menu_date, lang) : "—"}
                </p>
              </div>
              {row.source === "auto" && <Badge>{t.employee.auto}</Badge>}
            </Row>
          ))}
        </List>
      )}
    </>
  );
}

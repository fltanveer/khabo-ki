import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/date";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

type HistoryRow = {
  id: string;
  source: "manual" | "auto";
  items: { name: string } | null;
  daily_menus: { menu_date: string } | null;
};

export default async function HistoryPage() {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select("id, source, items(name), daily_menus(menu_date)")
    .eq("employee_id", profile.id)
    .order("picked_at", { ascending: false })
    .limit(120);

  const rows = (data ?? []) as unknown as HistoryRow[];

  return (
    <>
      <PageHeader title="Your picks" subtitle="Last 120 orders." />

      {rows.length === 0 ? (
        <Empty>No orders yet.</Empty>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{row.items?.name ?? "Removed item"}</p>
                  <p className="text-xs text-muted">
                    {row.daily_menus ? formatDate(row.daily_menus.menu_date) : "—"}
                  </p>
                </div>
                {row.source === "auto" && <Badge>auto</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

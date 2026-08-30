import { createClient } from "@/lib/supabase/server";

export type HistoryFilters = {
  from?: string;
  to?: string;
  employeeId?: string;
  itemId?: string;
};

export type HistoryRow = {
  id: string;
  source: "manual" | "auto";
  picked_at: string;
  unit_price_bdt: number;
  items: { name: string; name_bn: string | null } | null;
  profiles: { name: string; phone: string } | null;
  daily_menus: { menu_date: string } | null;
};

export function readFilters(params: Record<string, string | undefined>): HistoryFilters {
  return {
    from: params.from || undefined,
    to: params.to || undefined,
    employeeId: params.employee || undefined,
    itemId: params.item || undefined,
  };
}

export async function fetchHistory(filters: HistoryFilters, limit = 1000): Promise<HistoryRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select(
      "id, source, picked_at, unit_price_bdt, items(name, name_bn), profiles(name, phone), daily_menus!inner(menu_date)",
    )
    .order("picked_at", { ascending: false })
    .limit(limit);

  if (filters.from) query = query.gte("daily_menus.menu_date", filters.from);
  if (filters.to) query = query.lte("daily_menus.menu_date", filters.to);
  if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);
  if (filters.itemId) query = query.eq("item_id", filters.itemId);

  const { data } = await query;
  return (data ?? []) as unknown as HistoryRow[];
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: HistoryRow[]): string {
  const header = ["date", "employee", "phone", "item", "source", "taka", "picked_at"];
  const body = rows.map((row) =>
    [
      row.daily_menus?.menu_date ?? "",
      row.profiles?.name ?? "",
      row.profiles?.phone ?? "",
      row.items?.name ?? "",
      row.source,
      row.unit_price_bdt,
      row.picked_at,
    ]
      .map((cell) => csvCell(String(cell)))
      .join(","),
  );
  return [header.join(","), ...body].join("\n");
}

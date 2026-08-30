import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime, isPast, today } from "@/lib/date";
import { getI18n } from "@/lib/i18n/server";
import { fill, itemName } from "@/lib/i18n";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { MenuPicker, type PickableItem } from "./MenuPicker";

export const dynamic = "force-dynamic";

export default async function EmployeeToday() {
  const profile = await requireRole("employee");
  const { lang, t } = await getI18n();
  const supabase = await createClient();
  const menuDate = today();

  const { data: menu } = await supabase
    .from("daily_menus")
    .select("id, menu_date, cutoff_time, status, locked_at")
    .eq("menu_date", menuDate)
    .eq("status", "published")
    .maybeSingle();

  if (!menu) {
    return (
      <>
        <PageHeader title={t.employee.title} subtitle={formatDate(menuDate, lang)} />
        <Empty>{t.employee.noMenu}</Empty>
      </>
    );
  }

  const [{ data: menuItems }, { data: bans }, { data: order }] = await Promise.all([
    supabase
      .from("daily_menu_items")
      .select("item_id, items(id, name, name_bn, sort_order)")
      .eq("daily_menu_id", menu.id),
    supabase.from("employee_bans").select("item_id").eq("employee_id", profile.id),
    supabase
      .from("orders")
      .select("item_id, source")
      .eq("daily_menu_id", menu.id)
      .eq("employee_id", profile.id)
      .maybeSingle(),
  ]);

  const bannedIds = new Set((bans ?? []).map((b) => b.item_id));
  const all = (menuItems ?? [])
    .flatMap((row) => {
      const item = row.items as unknown as (PickableItem & { sort_order: number }) | null;
      return item ? [item] : [];
    })
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  const items = all.filter((item) => !bannedIds.has(item.id));
  const open = !menu.locked_at && !isPast(menu.cutoff_time);
  const hiddenCount = all.length - items.length;
  const cutoff = formatTime(menu.cutoff_time, lang);

  return (
    <>
      <PageHeader
        title={t.employee.title}
        subtitle={formatDate(menuDate, lang)}
        action={
          open ? (
            <Badge tone="warn">{fill(t.employee.closesAt, { time: cutoff }, lang)}</Badge>
          ) : (
            <Badge tone="bad">{t.employee.closed}</Badge>
          )
        }
      />

      {open && !order && (
        <Card className="mb-4 border-warn/40 bg-warn-soft">
          <p className="text-sm font-semibold">{t.employee.notPickedTitle}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {fill(t.employee.notPickedBody, { time: cutoff }, lang)}
          </p>
        </Card>
      )}

      {!open && (
        <Card className="mb-4">
          <p className="text-sm">
            {order
              ? fill(
                  t.employee.lockedIn,
                  {
                    item: (() => {
                      const picked = all.find((i) => i.id === order.item_id);
                      return picked ? itemName(picked, lang) : "—";
                    })(),
                  },
                  lang,
                )
              : t.employee.nothingOrdered}
          </p>
        </Card>
      )}

      {items.length === 0 ? (
        <Empty>{t.employee.allBanned}</Empty>
      ) : (
        <MenuPicker
          menuId={menu.id}
          items={items}
          currentItemId={order?.item_id ?? null}
          source={(order?.source as "manual" | "auto" | undefined) ?? null}
          open={open}
          cutoff={cutoff}
        />
      )}

      {hiddenCount > 0 && (
        <p className="mt-4 text-sm text-muted">
          {fill(t.employee.hiddenByBans, { count: hiddenCount }, lang)}
        </p>
      )}
    </>
  );
}

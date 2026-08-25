import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime, isPast, today } from "@/lib/date";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { MenuPicker, type PickableItem } from "./MenuPicker";

export const dynamic = "force-dynamic";

export default async function EmployeeToday() {
  const profile = await requireRole("employee");
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
        <PageHeader title="Today's lunch" subtitle={formatDate(menuDate)} />
        <Empty>No menu published yet. Check back once the kitchen list is in.</Empty>
      </>
    );
  }

  const [{ data: menuItems }, { data: bans }, { data: order }] = await Promise.all([
    supabase
      .from("daily_menu_items")
      .select("item_id, items(id, name)")
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
  const all = (menuItems ?? []).flatMap((row) => {
    const item = row.items as unknown as PickableItem | null;
    return item ? [item] : [];
  });
  const items = all
    .filter((item) => !bannedIds.has(item.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const open = !menu.locked_at && !isPast(menu.cutoff_time);
  const hiddenCount = all.length - items.length;

  return (
    <>
      <PageHeader
        title="Today's lunch"
        subtitle={formatDate(menuDate)}
        action={
          open ? (
            <Badge tone="warn">Ordering closes {formatTime(menu.cutoff_time)}</Badge>
          ) : (
            <Badge tone="bad">Ordering closed</Badge>
          )
        }
      />

      {open && !order && (
        <Card className="mb-5 border-warn/50 bg-warn/10">
          <p className="text-sm font-medium">You haven&apos;t picked anything yet.</p>
          <p className="mt-1 text-sm text-muted">
            Nothing is ordered for you unless you choose before {formatTime(menu.cutoff_time)}.
          </p>
        </Card>
      )}

      {!open && (
        <Card className="mb-5">
          <p className="text-sm">
            {order
              ? `Locked in: ${all.find((i) => i.id === order.item_id)?.name ?? "your pick"}.`
              : "You didn't pick anything today, so nothing was ordered for you."}
          </p>
        </Card>
      )}

      {items.length === 0 ? (
        <Empty>
          Everything on today&apos;s menu is on your banned list. Unban something in Preferences to
          order.
        </Empty>
      ) : (
        <MenuPicker
          menuId={menu.id}
          items={items}
          currentItemId={order?.item_id ?? null}
          source={(order?.source as "manual" | "auto" | undefined) ?? null}
          open={open}
        />
      )}

      {hiddenCount > 0 && (
        <p className="mt-4 text-sm text-muted">
          {hiddenCount} item{hiddenCount > 1 ? "s" : ""} hidden by your banned list.
        </p>
      )}
    </>
  );
}

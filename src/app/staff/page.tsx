import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { APP_TZ, formatDate, isPast, today } from "@/lib/date";
import { getI18n } from "@/lib/i18n/server";
import { fill } from "@/lib/i18n";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { MenuBuilder } from "./MenuBuilder";
import { StartDayButton } from "./StartDayButton";

export const dynamic = "force-dynamic";

function cutoffToHHMM(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export default async function StaffToday() {
  await requireRole("staff", "admin");
  const { lang, t } = await getI18n();
  const supabase = await createClient();
  const menuDate = today();

  const { data: menu } = await supabase
    .from("daily_menus")
    .select("id, menu_date, cutoff_time, status, locked_at")
    .eq("menu_date", menuDate)
    .maybeSingle();

  if (!menu) {
    return (
      <>
        <PageHeader title={t.staff.title} subtitle={formatDate(menuDate, lang)} />
        <Empty>
          <p className="mb-4">{t.staff.noMenuYet}</p>
          <div className="flex justify-center">
            <StartDayButton menuDate={menuDate} />
          </div>
        </Empty>
      </>
    );
  }

  const [{ data: menuItems }, { data: library }, { count: orderCount }] = await Promise.all([
    supabase
      .from("daily_menu_items")
      .select("item_id, items(id, name, name_bn, sort_order)")
      .eq("daily_menu_id", menu.id),
    supabase
      .from("items")
      .select("id, name, name_bn, sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("daily_menu_id", menu.id),
  ]);

  type LibItem = { id: string; name: string; name_bn: string | null; sort_order: number };

  const onMenu = (menuItems ?? []).flatMap((row) => {
    const item = row.items as unknown as LibItem | null;
    return item ? [item] : [];
  });

  // A dish that was retired after being added to today's menu still has to be
  // shown, otherwise it sits selected but invisible and can never be unticked.
  const byId = new Map<string, LibItem>();
  for (const item of [...((library ?? []) as LibItem[]), ...onMenu]) byId.set(item.id, item);
  const tiles = [...byId.values()].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  );

  const published = menu.status === "published";
  const lockedEarly = Boolean(menu.locked_at);

  // A draft is never "closed" — nobody can order from an unpublished menu, so
  // it stays fully editable even if its cutoff has already gone by.
  const orderingClosed = published && (lockedEarly || isPast(menu.cutoff_time));

  return (
    <>
      <PageHeader
        title={t.staff.title}
        subtitle={formatDate(menuDate, lang)}
        action={
          published ? (
            <Badge tone="brand">{fill(t.staff.ordersIn, { count: orderCount ?? 0 }, lang)}</Badge>
          ) : undefined
        }
      />

      <MenuBuilder
        menuId={menu.id}
        menuDate={menu.menu_date}
        cutoffHHMM={cutoffToHHMM(menu.cutoff_time)}
        published={published}
        lockedEarly={lockedEarly}
        orderingClosed={orderingClosed}
        library={tiles}
        initialSelected={onMenu.map((item) => item.id)}
      />
    </>
  );
}

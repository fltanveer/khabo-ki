import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { APP_TZ, formatDate, isPast, today } from "@/lib/date";
import { Card, Empty, PageHeader } from "@/components/ui";
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
        <PageHeader title="Today's menu" subtitle={formatDate(menuDate)} />
        <Empty>
          <p className="mb-4">
            No menu for today yet. Start one, add what the restaurant is bringing, then publish.
          </p>
          <div className="flex justify-center">
            <StartDayButton menuDate={menuDate} />
          </div>
        </Empty>
      </>
    );
  }

  const [{ data: menuItems }, { data: library }, { count: orderCount }] = await Promise.all([
    supabase.from("daily_menu_items").select("items(id, name)").eq("daily_menu_id", menu.id),
    supabase.from("items").select("id, name").eq("is_active", true).order("name"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("daily_menu_id", menu.id),
  ]);

  const onMenu = (menuItems ?? [])
    .flatMap((row) => {
      const item = row.items as unknown as { id: string; name: string } | null;
      return item ? [item] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const published = menu.status === "published";
  const locked = Boolean(menu.locked_at) || isPast(menu.cutoff_time);

  return (
    <>
      <PageHeader
        title="Today's menu"
        subtitle={formatDate(menuDate)}
        action={
          published ? (
            <Card className="px-4 py-2">
              <span className="text-sm">
                <strong>{orderCount ?? 0}</strong> orders in
              </span>
            </Card>
          ) : null
        }
      />

      <MenuBuilder
        menuId={menu.id}
        menuDate={menu.menu_date}
        cutoffHHMM={cutoffToHHMM(menu.cutoff_time)}
        published={published}
        locked={locked}
        closed={locked}
        onMenu={onMenu}
        library={library ?? []}
      />
    </>
  );
}

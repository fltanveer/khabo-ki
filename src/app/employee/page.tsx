import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime, isPast, today } from "@/lib/date";
import { getI18n } from "@/lib/i18n/server";
import { fill, itemName } from "@/lib/i18n";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { Tiffin } from "@/components/Tiffin";
import { CutoffHero } from "./CutoffHero";
import { MenuPicker, type PickableItem } from "./MenuPicker";
import { GuestMeals, type MyGuestMeal } from "./GuestMeals";
import { EventBanner } from "./EventBanner";

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
        <Empty mood="waiting">{t.employee.noMenu}</Empty>
      </>
    );
  }

  const [{ data: menuItems }, { data: bans }, { data: order }, { data: guestRows }] =
    await Promise.all([
    supabase
      .from("daily_menu_items")
      .select("item_id, items(id, name, name_bn, sort_order)")
      .eq("daily_menu_id", menu.id),
    supabase.from("employee_bans").select("item_id").eq("employee_id", profile.id),
    supabase
      .from("orders")
      .select("item_id, source, confirmed_at")
      .eq("daily_menu_id", menu.id)
      .eq("employee_id", profile.id)
      .maybeSingle(),
    supabase
      .from("guest_meals")
      .select("id, host_id, quantity, guest_label, unit_price_bdt, items(name, name_bn)")
      .eq("daily_menu_id", menu.id)
      .order("created_at"),
  ]);

  // Every guest meal in the office, not just this employee's — the whole point
  // is that people can see a guest is coming.
  const guests = (guestRows ?? []) as unknown as (MyGuestMeal & { host_id: string })[];
  const myGuests = guests.filter((g) => g.host_id === profile.id);
  const officeGuestCount = guests.reduce((sum, g) => sum + g.quantity, 0);

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
      <EventBanner />

      <PageHeader
        title={t.employee.title}
        subtitle={formatDate(menuDate, lang)}
        action={open ? undefined : <Badge tone="bad">{t.employee.closed}</Badge>}
      />

      {open && (
        <CutoffHero
          cutoffIso={menu.cutoff_time}
          cutoff={cutoff}
          picked={Boolean(order?.confirmed_at)}
          message={
            order?.confirmed_at
              ? fill(t.employee.changeHint, { time: cutoff }, lang)
              : fill(t.employee.notPickedBody, { time: cutoff }, lang)
          }
        />
      )}

      {!open && (
        <div className="mb-7 flex items-center gap-4 rounded-card bg-surface p-5 pr-6 shadow-[var(--shadow-card)]">
          <Tiffin
            mood={order?.confirmed_at ? "happy" : "sleepy"}
            className="h-24 w-20 shrink-0"
          />
          <p className="min-w-0 text-[1.05rem] font-medium leading-relaxed">
            {order?.confirmed_at
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
        </div>
      )}

      {open && items.length > 0 && (
        <h2 className="mb-3 flex items-baseline justify-between font-display text-[1.25rem] font-medium tracking-[-0.01em]">
          {t.employee.pickOne}
          <span className="text-sm font-normal text-muted tabular-nums">{items.length}</span>
        </h2>
      )}

      {items.length === 0 ? (
        <Empty mood="sleepy">{t.employee.allBanned}</Empty>
      ) : (
        <MenuPicker
          menuId={menu.id}
          items={items}
          currentItemId={order?.item_id ?? null}
          source={(order?.source as "manual" | "auto" | undefined) ?? null}
          confirmed={Boolean(order?.confirmed_at)}
          open={open}
          cutoff={cutoff}
        />
      )}

      <div className="mt-7">
        <GuestMeals
          menuId={menu.id}
          items={items}
          mine={myGuests}
          open={open}
          officeCount={officeGuestCount}
        />
      </div>

      {hiddenCount > 0 && (
        <p className="mt-4 text-sm text-muted">
          {fill(t.employee.hiddenByBans, { count: hiddenCount }, lang)}
        </p>
      )}
    </>
  );
}

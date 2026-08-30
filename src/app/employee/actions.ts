"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { ActionResult } from "@/lib/errors";

// RLS is what actually enforces "before cutoff, on the menu, not banned" —
// these actions just report a code the UI can phrase in either language.
export async function pickItem(menuId: string, itemId: string): Promise<ActionResult> {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const { error } = await supabase.from("orders").upsert(
    {
      employee_id: profile.id,
      daily_menu_id: menuId,
      item_id: itemId,
      source: "manual",
      picked_at: new Date().toISOString(),
    },
    { onConflict: "employee_id,daily_menu_id" },
  );

  if (error) return { error: "pick_failed" };

  revalidatePath("/employee");
  return {};
}

export async function clearPick(menuId: string): Promise<ActionResult> {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("employee_id", profile.id)
    .eq("daily_menu_id", menuId);

  if (error) return { error: "clear_failed" };

  revalidatePath("/employee");
  return {};
}

export async function toggleBan(itemId: string, banned: boolean): Promise<ActionResult> {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const { error } = banned
    ? await supabase.from("employee_bans").insert({ employee_id: profile.id, item_id: itemId })
    : await supabase
        .from("employee_bans")
        .delete()
        .eq("employee_id", profile.id)
        .eq("item_id", itemId);

  if (error) return { error: "generic" };

  // A newly banned dish may be sitting in today's order or preference list.
  if (banned) {
    await supabase
      .from("employee_pick_rules")
      .delete()
      .eq("employee_id", profile.id)
      .eq("item_id", itemId);
    await supabase
      .from("orders")
      .delete()
      .eq("employee_id", profile.id)
      .eq("item_id", itemId)
      .gte("picked_at", new Date(Date.now() - 86_400_000).toISOString());
  }

  revalidatePath("/employee/preferences");
  revalidatePath("/employee");
  return {};
}

export async function savePickRules(itemIds: string[]): Promise<ActionResult> {
  await requireRole("employee");
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_pick_rules", { p_item_ids: itemIds });
  if (error) return { error: "generic" };

  revalidatePath("/employee/preferences");
  return {};
}

// Guests eat on the host's tab but pick their own dish. RLS is what enforces
// "before cutoff, on today's menu" — deliberately not the host's ban list, since
// a guest may well want the thing the host never eats.
export async function addGuestMeal(
  menuId: string,
  itemId: string,
  quantity: number,
  label: string,
): Promise<ActionResult> {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const count = Math.min(Math.max(Math.trunc(quantity) || 1, 1), 20);
  const name = label.trim();

  const { error } = await supabase.from("guest_meals").insert({
    host_id: profile.id,
    daily_menu_id: menuId,
    item_id: itemId,
    quantity: count,
    guest_label: name.length > 0 ? name.slice(0, 60) : null,
  });

  if (error) return { error: "guest_add_failed" };

  revalidatePath("/employee");
  revalidatePath("/employee/money");
  return {};
}

export async function removeGuestMeal(guestMealId: string): Promise<ActionResult> {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const { error } = await supabase
    .from("guest_meals")
    .delete()
    .eq("id", guestMealId)
    .eq("host_id", profile.id);

  if (error) return { error: "guest_remove_failed" };

  revalidatePath("/employee");
  revalidatePath("/employee/money");
  return {};
}

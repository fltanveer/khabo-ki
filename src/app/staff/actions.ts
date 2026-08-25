"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { cutoffFor } from "@/lib/date";
import type { ActionResult } from "@/lib/errors";

type Result = ActionResult & { autoPicks?: number; saved?: boolean };

const DEFAULT_CUTOFF = "10:30";

export async function ensureMenu(menuDate: string): Promise<Result> {
  await requireRole("staff", "admin");
  const supabase = await createClient();

  const { error } = await supabase.from("daily_menus").insert({
    menu_date: menuDate,
    cutoff_time: cutoffFor(menuDate, DEFAULT_CUTOFF),
  });

  // A duplicate just means another staff member started the day first.
  if (error && !error.message.includes("duplicate")) return { error: "generic" };

  revalidatePath("/staff");
  return {};
}

export async function setCutoff(menuId: string, menuDate: string, hhmm: string): Promise<Result> {
  await requireRole("staff", "admin");
  const supabase = await createClient();

  const { error } = await supabase
    .from("daily_menus")
    .update({ cutoff_time: cutoffFor(menuDate, hhmm) })
    .eq("id", menuId);

  if (error) return { error: "generic" };
  revalidatePath("/staff");
  return { saved: true };
}

// Staff tick the whole day's menu at once, so it saves as a set. Dishes that
// were unticked are removed, which drops the orders that pointed at them —
// the count of people left with nothing comes back so we can warn about it.
export async function syncMenuItems(menuId: string, itemIds: string[]): Promise<Result> {
  await requireRole("staff", "admin");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("sync_menu_items", {
    p_menu_id: menuId,
    p_item_ids: itemIds,
  });

  if (error) return { error: "generic" };

  revalidatePath("/staff");
  revalidatePath("/staff/orders");
  return { saved: true, orphaned: (data ?? []).length };
}

// A one-off dish the restaurant brought today. It joins the library so it can
// be reused tomorrow without retyping, and sorts after the standing dishes.
export async function addOneOffDish(rawName: string): Promise<Result & { itemId?: string }> {
  const profile = await requireRole("staff", "admin");
  const supabase = await createClient();

  const name = rawName.trim();
  if (name.length < 2) return { error: "dish_name_too_short" };

  const { data: existing } = await supabase
    .from("items")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  if (existing) {
    await supabase.from("items").update({ is_active: true }).eq("id", existing.id);
    revalidatePath("/staff");
    return { itemId: existing.id };
  }

  const { data: created, error } = await supabase
    .from("items")
    .insert({ name, created_by: profile.id })
    .select("id")
    .single();

  if (error) return { error: "generic" };

  revalidatePath("/staff");
  revalidatePath("/staff/items");
  return { itemId: created.id };
}

export async function publishMenu(menuId: string): Promise<Result> {
  await requireRole("staff", "admin");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("publish_menu", { p_menu_id: menuId });
  if (error) return { error: "generic" };

  revalidatePath("/staff");
  revalidatePath("/staff/orders");
  return { autoPicks: (data as number) ?? 0 };
}

export async function lockMenu(menuId: string): Promise<Result> {
  await requireRole("staff", "admin");
  const supabase = await createClient();

  const { error } = await supabase.rpc("lock_menu", { p_menu_id: menuId });
  if (error) return { error: "generic" };

  revalidatePath("/staff");
  revalidatePath("/staff/orders");
  return { saved: true };
}

export async function createLibraryItem(rawName: string): Promise<Result> {
  const profile = await requireRole("staff", "admin");
  const supabase = await createClient();

  const name = rawName.trim();
  if (name.length < 2) return { error: "dish_name_too_short" };

  const { error } = await supabase.from("items").insert({ name, created_by: profile.id });
  if (error) {
    return { error: error.message.includes("duplicate") ? "duplicate_dish" : "generic" };
  }

  revalidatePath("/staff/items");
  revalidatePath("/staff");
  return {};
}

export async function setItemActive(itemId: string, isActive: boolean): Promise<Result> {
  await requireRole("staff", "admin");
  const supabase = await createClient();

  const { error } = await supabase.from("items").update({ is_active: isActive }).eq("id", itemId);
  if (error) return { error: "generic" };

  revalidatePath("/staff/items");
  revalidatePath("/staff");
  return {};
}

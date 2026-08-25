"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { cutoffFor } from "@/lib/date";

type Result = { error?: string; message?: string };

const DEFAULT_CUTOFF = "10:30";

export async function ensureMenu(menuDate: string): Promise<Result> {
  await requireRole("staff", "admin");
  const supabase = await createClient();

  const { error } = await supabase.from("daily_menus").insert({
    menu_date: menuDate,
    cutoff_time: cutoffFor(menuDate, DEFAULT_CUTOFF),
  });

  // A duplicate just means another staff member started the day first.
  if (error && !error.message.includes("duplicate")) return { error: error.message };

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

  if (error) return { error: error.message };
  revalidatePath("/staff");
  return {};
}

export async function addExistingItem(menuId: string, itemId: string): Promise<Result> {
  await requireRole("staff", "admin");
  const supabase = await createClient();

  const { error } = await supabase.rpc("add_menu_item", {
    p_menu_id: menuId,
    p_item_id: itemId,
  });

  if (error) return { error: error.message };
  revalidatePath("/staff");
  return {};
}

// A one-off dish the restaurant brought today. It joins the library so it can
// be reused tomorrow without retyping.
export async function addNewItem(menuId: string, rawName: string): Promise<Result> {
  const profile = await requireRole("staff", "admin");
  const supabase = await createClient();

  const name = rawName.trim();
  if (name.length < 2) return { error: "Give the item a name." };

  const { data: existing } = await supabase
    .from("items")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  let itemId = existing?.id;

  if (!itemId) {
    const { data: created, error } = await supabase
      .from("items")
      .insert({ name, created_by: profile.id })
      .select("id")
      .single();
    if (error) return { error: error.message };
    itemId = created.id;
  }

  return addExistingItem(menuId, itemId);
}

export async function removeItem(menuId: string, itemId: string): Promise<Result> {
  await requireRole("staff", "admin");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("remove_menu_item", {
    p_menu_id: menuId,
    p_item_id: itemId,
  });

  if (error) return { error: error.message };

  revalidatePath("/staff");
  revalidatePath("/staff/orders");

  const orphaned = (data ?? []).length;
  return orphaned
    ? {
        message: `${orphaned} ${orphaned === 1 ? "person" : "people"} had ordered that and now have no lunch — tell them to pick again.`,
      }
    : {};
}

export async function publishMenu(menuId: string): Promise<Result> {
  await requireRole("staff", "admin");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("publish_menu", { p_menu_id: menuId });
  if (error) return { error: error.message };

  revalidatePath("/staff");
  revalidatePath("/staff/orders");
  return { message: `Published. ${data ?? 0} auto-picks seated.` };
}

export async function lockMenu(menuId: string): Promise<Result> {
  await requireRole("staff", "admin");
  const supabase = await createClient();

  const { error } = await supabase.rpc("lock_menu", { p_menu_id: menuId });
  if (error) return { error: error.message };

  revalidatePath("/staff");
  revalidatePath("/staff/orders");
  return { message: "Ordering closed." };
}

export async function createLibraryItem(rawName: string): Promise<Result> {
  const profile = await requireRole("staff", "admin");
  const supabase = await createClient();

  const name = rawName.trim();
  if (name.length < 2) return { error: "Give the item a name." };

  const { error } = await supabase.from("items").insert({ name, created_by: profile.id });
  if (error) {
    return { error: error.message.includes("duplicate") ? "That item already exists." : error.message };
  }

  revalidatePath("/staff/items");
  return {};
}

export async function setItemActive(itemId: string, isActive: boolean): Promise<Result> {
  await requireRole("staff", "admin");
  const supabase = await createClient();

  const { error } = await supabase.from("items").update({ is_active: isActive }).eq("id", itemId);
  if (error) return { error: error.message };

  revalidatePath("/staff/items");
  return {};
}

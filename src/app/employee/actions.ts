"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

type Result = { error?: string };

// RLS is what actually enforces "before cutoff, on the menu, not banned" —
// these actions just surface a readable message when it rejects.
export async function pickItem(menuId: string, itemId: string): Promise<Result> {
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

  if (error) return { error: "Couldn't save that pick — ordering may have closed." };

  revalidatePath("/employee");
  return {};
}

export async function clearPick(menuId: string): Promise<Result> {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("employee_id", profile.id)
    .eq("daily_menu_id", menuId);

  if (error) return { error: "Couldn't clear that pick — ordering may have closed." };

  revalidatePath("/employee");
  return {};
}

export async function toggleBan(itemId: string, banned: boolean): Promise<Result> {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const { error } = banned
    ? await supabase.from("employee_bans").insert({ employee_id: profile.id, item_id: itemId })
    : await supabase
        .from("employee_bans")
        .delete()
        .eq("employee_id", profile.id)
        .eq("item_id", itemId);

  if (error) return { error: error.message };

  // A newly banned item may be sitting in today's order or preference list.
  if (banned) {
    await supabase.from("employee_pick_rules").delete()
      .eq("employee_id", profile.id).eq("item_id", itemId);
    await supabase.from("orders").delete()
      .eq("employee_id", profile.id).eq("item_id", itemId)
      .gte("picked_at", new Date(Date.now() - 86_400_000).toISOString());
  }

  revalidatePath("/employee/preferences");
  revalidatePath("/employee");
  return {};
}

export async function savePickRules(itemIds: string[]): Promise<Result> {
  await requireRole("employee");
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_pick_rules", { p_item_ids: itemIds });
  if (error) return { error: error.message };

  revalidatePath("/employee/preferences");
  return {};
}

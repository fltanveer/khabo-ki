"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import type { ActionResult } from "@/lib/errors";

// Only the shown name is editable. The registered name stays as it was so an
// admin can always match an account back to the person who signed up.
export async function saveDisplayName(displayName: string): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || profile.status !== "active") return { error: "session_expired" };

  const chosen = displayName.trim().slice(0, 60);
  if (chosen.length > 0 && chosen.length < 2) return { error: "invalid_name" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: chosen.length > 0 ? chosen : null })
    .eq("id", profile.id);

  if (error) return { error: "generic" };

  revalidatePath("/settings");
  revalidatePath("/staff/orders");
  return {};
}

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { PreferencesEditor } from "./PreferencesEditor";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const profile = await requireRole("employee");
  const supabase = await createClient();

  const [{ data: items }, { data: bans }, { data: rules }] = await Promise.all([
    supabase.from("items").select("id, name").eq("is_active", true).order("name"),
    supabase.from("employee_bans").select("item_id").eq("employee_id", profile.id),
    supabase
      .from("employee_pick_rules")
      .select("item_id, priority_rank")
      .eq("employee_id", profile.id)
      .order("priority_rank"),
  ]);

  return (
    <>
      <PageHeader
        title="Preferences"
        subtitle="Rank what you want ordered for you, and hide what you never eat."
      />
      <PreferencesEditor
        items={items ?? []}
        initialBans={(bans ?? []).map((b) => b.item_id)}
        initialRanked={(rules ?? []).map((r) => r.item_id)}
      />
    </>
  );
}

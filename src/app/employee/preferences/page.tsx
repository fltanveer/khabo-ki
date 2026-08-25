import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { PreferencesEditor } from "./PreferencesEditor";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const profile = await requireRole("employee");
  const { t } = await getI18n();
  const supabase = await createClient();

  const [{ data: items }, { data: bans }, { data: rules }] = await Promise.all([
    supabase
      .from("items")
      .select("id, name, name_bn")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    supabase.from("employee_bans").select("item_id").eq("employee_id", profile.id),
    supabase
      .from("employee_pick_rules")
      .select("item_id, priority_rank")
      .eq("employee_id", profile.id)
      .order("priority_rank"),
  ]);

  return (
    <>
      <PageHeader title={t.prefs.title} subtitle={t.prefs.subtitle} />
      <PreferencesEditor
        items={items ?? []}
        initialBans={(bans ?? []).map((b) => b.item_id)}
        initialRanked={(rules ?? []).map((r) => r.item_id)}
      />
    </>
  );
}

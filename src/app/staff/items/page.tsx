import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { ItemLibrary } from "./ItemLibrary";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  await requireRole("staff", "admin");
  const { t } = await getI18n();
  const supabase = await createClient();

  const { data } = await supabase
    .from("items")
    .select("id, name, name_bn, is_active")
    .order("is_active", { ascending: false })
    .order("sort_order")
    .order("name");

  return (
    <>
      <PageHeader title={t.staff.libraryTitle} subtitle={t.staff.librarySubtitle} />
      <ItemLibrary items={data ?? []} />
    </>
  );
}

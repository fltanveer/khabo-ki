import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { ItemLibrary } from "./ItemLibrary";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  await requireRole("staff", "admin");
  const supabase = await createClient();

  const { data } = await supabase
    .from("items")
    .select("id, name, is_active")
    .order("is_active", { ascending: false })
    .order("name");

  return (
    <>
      <PageHeader
        title="Item library"
        subtitle="Reusable dishes. Building a daily menu picks from here."
      />
      <ItemLibrary items={data ?? []} />
    </>
  );
}

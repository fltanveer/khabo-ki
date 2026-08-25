import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { PeopleManager } from "./PeopleManager";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPeople() {
  const admin = await requireRole("admin");
  const { t } = await getI18n();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("status")
    .order("name")
    .returns<Profile[]>();

  return (
    <>
      <PageHeader title={t.admin.peopleTitle} subtitle={t.admin.peopleSubtitle} />
      <PeopleManager people={data ?? []} selfId={admin.id} />
    </>
  );
}

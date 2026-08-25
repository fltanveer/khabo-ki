import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { PeopleManager } from "./PeopleManager";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPeople() {
  const admin = await requireRole("admin");
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("status")
    .order("name")
    .returns<Profile[]>();

  return (
    <>
      <PageHeader title="People" subtitle="Approve registrations and manage accounts." />
      <PeopleManager people={data ?? []} selfId={admin.id} />
    </>
  );
}

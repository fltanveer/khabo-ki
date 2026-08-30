import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui";
import { PeopleManager } from "./PeopleManager";
import { ResetRequests } from "./ResetRequests";
import type { PasswordReset, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPeople() {
  const admin = await requireRole("admin");
  const { t } = await getI18n();
  const supabase = await createClient();

  const [{ data: people }, { data: resets }] = await Promise.all([
    supabase.from("profiles").select("*").order("status").order("name").returns<Profile[]>(),
    supabase
      .from("password_resets")
      // Two columns point at profiles (user_id and approved_by), so the
      // embed has to name the constraint or PostgREST can't pick one.
      .select(
        "id, user_id, status, code, requested_at, expires_at, profile:profiles!password_resets_user_id_fkey(name, phone, role)",
      )
      .in("status", ["pending", "approved"])
      .order("requested_at", { ascending: false })
      .returns<PasswordReset[]>(),
  ]);

  return (
    <>
      <PageHeader title={t.admin.peopleTitle} subtitle={t.admin.peopleSubtitle} />
      <ResetRequests requests={resets ?? []} />
      <PeopleManager people={people ?? []} selfId={admin.id} />
    </>
  );
}

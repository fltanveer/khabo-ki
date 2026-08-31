import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Section } from "@/components/ui";
import { NameSettings } from "./NameSettings";
import { PaymentSettings } from "./payment/PaymentSettings";
import type { PaymentDetails } from "@/lib/types";

export const dynamic = "force-dynamic";

// Outside the role-gated sections: everyone has a name, and anyone can end up
// collecting money for a party.
export default async function SettingsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/pending");

  const { t } = await getI18n();
  const supabase = await createClient();

  const { data } = await supabase
    .from("payment_details")
    .select("employee_id, provider, number, qr_image")
    .eq("employee_id", profile.id)
    .maybeSingle();

  return (
    <AppShell profile={profile}>
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />

      <Section title={t.settings.nameTitle} description={t.settings.nameBody}>
        <NameSettings registeredName={profile.name} displayName={profile.display_name} />
      </Section>

      <Section title={t.payment.title} description={t.payment.body}>
        <PaymentSettings details={(data as PaymentDetails | null) ?? null} />
      </Section>
    </AppShell>
  );
}

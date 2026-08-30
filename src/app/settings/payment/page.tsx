import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { PaymentSettings } from "./PaymentSettings";
import type { PaymentDetails } from "@/lib/types";

export const dynamic = "force-dynamic";

// Any role can be a collector — the office admin takes lunch money, and any
// employee might be the one fronting a party — so this sits outside the
// role-gated sections.
export default async function PaymentSettingsPage() {
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
      <PageHeader title={t.payment.title} subtitle={t.payment.body} />
      <PaymentSettings details={(data as PaymentDetails | null) ?? null} />
    </AppShell>
  );
}

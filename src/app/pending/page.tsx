import { getProfile } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { signOut } from "@/app/actions";
import { AuthLayout } from "@/components/AuthLayout";
import { Card } from "@/components/ui";

export default async function PendingPage() {
  const profile = await getProfile();
  const { t } = await getI18n();
  const deactivated = profile?.status === "inactive";

  return (
    <AuthLayout title={deactivated ? t.auth.deactivated : t.auth.waitingApproval}>
      <Card>
        <p className="text-sm leading-relaxed text-muted">
          {deactivated ? t.auth.deactivatedBody : t.auth.waitingBody}
        </p>
        <form action={signOut} className="mt-4">
          <button
            type="submit"
            className="text-sm font-medium text-brand underline underline-offset-2"
          >
            {t.common.signOut}
          </button>
        </form>
      </Card>
    </AuthLayout>
  );
}

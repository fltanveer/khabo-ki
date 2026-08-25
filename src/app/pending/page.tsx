import { getProfile } from "@/lib/auth";
import { signOut } from "@/app/actions";
import { Card } from "@/components/ui";

export default async function PendingPage() {
  const profile = await getProfile();
  const deactivated = profile?.status === "inactive";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <Card>
        <h1 className="text-xl font-semibold">
          {deactivated ? "Account deactivated" : "Waiting for approval"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {deactivated
            ? "An admin has switched off this account. Talk to them if that's a mistake."
            : "An admin still needs to approve your account. Check back shortly."}
        </p>
        <form action={signOut} className="mt-4">
          <button type="submit" className="text-sm text-brand underline">
            Sign out
          </button>
        </form>
      </Card>
    </main>
  );
}

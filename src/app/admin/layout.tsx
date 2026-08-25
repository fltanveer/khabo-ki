import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin");
  return <AppShell profile={profile}>{children}</AppShell>;
}

import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("staff");
  return <AppShell profile={profile}>{children}</AppShell>;
}

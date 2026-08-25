import { requireRole } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("employee");
  return <AppShell profile={profile}>{children}</AppShell>;
}

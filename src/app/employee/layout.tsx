import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Nav";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("employee");
  return <Shell profile={profile}>{children}</Shell>;
}

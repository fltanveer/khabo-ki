import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Nav";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("staff");
  return <Shell profile={profile}>{children}</Shell>;
}

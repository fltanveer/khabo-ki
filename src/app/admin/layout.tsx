import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("admin");
  return <Shell profile={profile}>{children}</Shell>;
}

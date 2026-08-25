import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return data ?? null;
}

// Middleware already gates the sections; this re-checks server-side so a
// page can never render with the wrong role if a route slips past the matcher.
export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/pending");
  if (!roles.includes(profile.role)) redirect("/");
  return profile;
}

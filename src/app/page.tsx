import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { HOME_FOR_ROLE } from "@/lib/types";

export default async function Home() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/pending");
  redirect(HOME_FOR_ROLE[profile.role]);
}

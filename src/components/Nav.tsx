import Link from "next/link";
import { signOut } from "@/app/actions";
import type { Profile, Role } from "@/lib/types";

const LINKS: Record<Role, { href: string; label: string }[]> = {
  employee: [
    { href: "/employee", label: "Today" },
    { href: "/employee/preferences", label: "Preferences" },
    { href: "/employee/history", label: "History" },
  ],
  staff: [
    { href: "/staff", label: "Today's menu" },
    { href: "/staff/orders", label: "Orders" },
    { href: "/staff/items", label: "Item library" },
  ],
  admin: [
    { href: "/admin", label: "People" },
    { href: "/admin/history", label: "Order history" },
  ],
};

export function Nav({ profile }: { profile: Profile }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
        <span className="text-lg font-semibold tracking-tight">Khabo Ki?</span>

        <nav className="flex flex-1 flex-wrap gap-4 text-sm">
          {LINKS[profile.role].map((link) => (
            <Link key={link.href} href={link.href} className="text-muted hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted">
            {profile.name} · {profile.role}
          </span>
          <form action={signOut}>
            <button type="submit" className="text-muted underline hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function Shell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return (
    <>
      <Nav profile={profile} />
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </>
  );
}

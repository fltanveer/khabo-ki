"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions";
import type { Profile, Role } from "@/lib/types";
import { useI18n } from "./I18nProvider";
import { LangToggle, ThemeToggle } from "./Toggles";

type Icon =
  | "today"
  | "prefs"
  | "history"
  | "menu"
  | "orders"
  | "library"
  | "people"
  | "reports"
  | "events"
  | "money";

function NavIcon({ name }: { name: Icon }) {
  // One family: every glyph is drawn on the same 24 grid at the same stroke
  // weight, and no two share a silhouette. "Today" and "Preferences" used to
  // be three horizontal lines each, which made them impossible to tell apart
  // at tab-bar size.
  const paths: Record<Icon, ReturnType<typeof String>> = {
    // a bowl of something hot
    today: "M4 11h16a8 8 0 0 1-16 0ZM9 7.5c0-1 1.5-1.5 1.5-3M14 7.5c0-1 1.5-1.5 1.5-3",
    // sliders
    prefs:
      "M4 8.5h4M12 8.5h8M4 15.5h10M18 15.5h2M12 8.5a2 2 0 1 0-4 0 2 2 0 0 0 4 0M18 15.5a2 2 0 1 0-4 0 2 2 0 0 0 4 0",
    history: "M12 7v5l3 2M4 12a8 8 0 1 0 8-8 8 8 0 0 0-8 8Z",
    menu: "M5 5h14v14H5zM9 9h6M9 13h6",
    orders: "M6 4h12l1 16H5L6 4ZM9 8h6",
    library: "M5 5h5v14H5zM14 5h5v14h-5z",
    people:
      "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a5 5 0 0 1 10 0M17 11a3 3 0 1 0 0-6M15 20h6a5 5 0 0 0-3-4.6",
    reports: "M5 19V9M12 19V5M19 19v-7",
    // a wrapped gift
    events: "M4.5 11h15v9h-15zM3.5 7.5h17V11h-17zM12 7.5V20",
    // a banknote
    money: "M3 7.5h18v9H3zM14.5 12a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0",
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[22px] w-[22px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

type NavItem = { href: string; key: Icon; label: string };

function useNav(role: Role): NavItem[] {
  const { t } = useI18n();
  if (role === "employee") {
    return [
      { href: "/employee", key: "today", label: t.nav.today },
      { href: "/employee/events", key: "events", label: t.nav.events },
      { href: "/employee/money", key: "money", label: t.nav.money },
      { href: "/employee/preferences", key: "prefs", label: t.nav.preferences },
    ];
  }
  if (role === "staff") {
    return [
      { href: "/staff", key: "menu", label: t.nav.menu },
      { href: "/staff/orders", key: "orders", label: t.nav.orders },
      { href: "/staff/items", key: "library", label: t.nav.library },
    ];
  }
  return [
    { href: "/admin", key: "people", label: t.nav.people },
    { href: "/admin/money", key: "money", label: t.nav.money },
    { href: "/admin/history", key: "reports", label: t.nav.reports },
  ];
}

function isActive(pathname: string, href: string, items: NavItem[]): boolean {
  if (pathname === href) return true;
  // Only let a parent claim the highlight when no deeper item matches.
  const deeper = items.some((i) => i.href !== href && pathname.startsWith(i.href));
  return !deeper && pathname.startsWith(`${href}/`);
}

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const items = useNav(profile.role);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <span className="text-base font-semibold tracking-tight sm:text-lg">{t.appName}</span>

          {/* Desktop keeps the links inline; mobile gets the tab bar below. */}
          <nav className="ml-4 hidden flex-1 items-center gap-1 md:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href, items) ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  isActive(pathname, item.href, items)
                    ? "bg-brand-soft text-brand"
                    : "text-muted hover:bg-raised hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-8">{children}</main>

      <div className="mx-auto max-w-4xl px-4 pb-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
          <span className="text-muted">
            {profile.name} · {t.roles[profile.role]}
          </span>
          <Link
            href="/settings"
            className="text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            {t.settings.title}
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg px-3 py-2 font-medium text-muted transition hover:bg-raised hover:text-ink"
            >
              {t.common.signOut}
            </button>
          </form>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-md">
          {items.map((item) => {
            const active = isActive(pathname, item.href, items);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
                  active ? "text-brand" : "text-muted"
                }`}
              >
                <NavIcon name={item.key} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

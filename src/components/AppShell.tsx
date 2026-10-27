"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Profile, Role } from "@/lib/types";
import { useI18n } from "./I18nProvider";
import { SideMenu, initials } from "./SideMenu";
import { Logo } from "./Tiffin";

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

function NavIcon({ name, active = false }: { name: Icon; active?: boolean }) {
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
      strokeWidth={active ? 2.1 : 1.7}
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
  // The role's home tab is only "here" when you're on it — Preferences lives
  // under /employee but belongs to the side menu, not to Today.
  if (href === items[0]?.href) return false;
  // Only let a parent claim the highlight when no deeper item matches.
  const deeper = items.some((i) => i.href !== href && pathname.startsWith(i.href));
  return !deeper && pathname.startsWith(`${href}/`);
}

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const items = useNav(profile.role);
  const shownName = profile.display_name || profile.name;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* No fill of its own: at rest the blur only sees the smooth wash, so
          there is no band; scrolled content blurs out behind the logo. */}
      <header className="sticky top-0 z-30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <Logo alt={t.appName} className="h-8 w-auto" />

          {/* Desktop keeps the destinations inline; phones get the capsule. */}
          <nav className="ml-6 hidden flex-1 items-center gap-1 rounded-full bg-surface/70 p-1 md:flex md:flex-none">
            {items.map((item) => {
              const active = isActive(pathname, item.href, items);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    active ? "bg-ink text-bg" : "text-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-label={`${t.menu.open}: ${shownName}`}
            className="ml-auto flex h-12 items-center gap-2 rounded-full bg-surface/80 py-1 pl-1 pr-3.5 shadow-[var(--shadow-card)] transition active:scale-95"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-[0.8rem] font-semibold tracking-wide text-bg">
              {initials(shownName)}
            </span>
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-ink"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M5 8h14M5 12h14M5 16h9" />
            </svg>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-8 pt-4 sm:px-6 sm:pt-8">{children}</main>

      <SideMenu profile={profile} open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* A floating capsule instead of a full-width tab bar. Inactive stops are
          bare icons; the current one opens into a white pill with its label,
          so the state is a shape and a word, not just a tint. */}
      <nav
        aria-label={t.appName}
        className="fixed inset-x-0 z-30 flex justify-center px-4 md:hidden"
        style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex w-full max-w-[21rem] items-center gap-1 rounded-full bg-ink p-1.5 shadow-float">
          {items.map((item) => {
            const active = isActive(pathname, item.href, items);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={active ? undefined : item.label}
                className={`flex h-12 min-w-0 items-center justify-center gap-2 rounded-full transition-[background-color,flex-grow] duration-200 ${
                  active ? "flex-[1.6] bg-bg px-4 text-ink" : "flex-1 text-bg/60 hover:text-bg"
                }`}
              >
                <NavIcon name={item.key} active={active} />
                {active && <span className="text-sm font-semibold">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

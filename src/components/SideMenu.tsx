"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { signOut } from "@/app/actions";
import type { Profile } from "@/lib/types";
import { useI18n } from "./I18nProvider";
import { LangToggle, ThemeToggle } from "./Toggles";

function Glyph({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0",
  prefs:
    "M4 8.5h4M12 8.5h8M4 15.5h10M18 15.5h2M12 8.5a2 2 0 1 0-4 0 2 2 0 0 0 4 0M18 15.5a2 2 0 1 0-4 0 2 2 0 0 0 4 0",
  logout: "M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10",
  close: "M6 6l12 12M18 6 6 18",
  chevron: "m9 6 6 6-6 6",
};

export function initials(name: string): string {
  const parts = name
    .replace(/[^\p{L}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "·";
}

function MenuLink({
  href,
  icon,
  label,
  hint,
  onNavigate,
}: {
  href: string;
  icon: keyof typeof ICONS;
  label: string;
  hint: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex min-h-16 items-center gap-3.5 rounded-[1.25rem] px-3 py-2.5 transition-colors hover:bg-raised"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-raised text-ink">
        <Glyph d={ICONS[icon]} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="block truncate text-sm text-muted">{hint}</span>
      </span>
      <Glyph d={ICONS.chevron} className="h-4 w-4 shrink-0 text-faint" />
    </Link>
  );
}

// The overflow for everything that isn't a daily destination: who you are,
// how you like lunch picked, language, theme and signing out. Opened from the
// avatar in the header on every screen size.
export function SideMenu({
  profile,
  open,
  onClose,
}: {
  profile: Profile;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const shownName = profile.display_name || profile.name;

  // The dialog element is the source of truth for open/closed; React only asks.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="side-menu"
      aria-label={t.menu.open}
      onClose={onClose}
      // A click that lands on the dialog box itself, not its content, is a
      // click on the backdrop.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex h-full flex-col px-4 pb-4"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label={t.menu.close}
            className="grid h-11 w-11 place-items-center rounded-full border border-line text-ink transition active:scale-95"
          >
            <Glyph d={ICONS.close} />
          </button>
        </div>

        {/* who's signed in */}
        <div className="mt-2 flex items-center gap-4 px-3 pb-6">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand text-xl font-semibold text-on-brand">
            {initials(shownName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[1.375rem] font-medium leading-tight tracking-[-0.015em]">
              {shownName}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-good" />
              {t.roles[profile.role]}
              <span className="text-faint">·</span>
              <span className="tabular-nums">{profile.phone}</span>
            </p>
          </div>
        </div>

        <p className="px-3 pb-1 text-xs font-medium uppercase tracking-[0.08em] text-faint">
          {t.menu.account}
        </p>
        <nav className="space-y-0.5">
          <MenuLink
            href="/settings"
            icon="user"
            label={t.menu.profile}
            hint={t.menu.profileHint}
            onNavigate={onClose}
          />
          {profile.role === "employee" && (
            <MenuLink
              href="/employee/preferences"
              icon="prefs"
              label={t.nav.preferences}
              hint={t.menu.prefsHint}
              onNavigate={onClose}
            />
          )}
        </nav>

        <p className="px-3 pb-1 pt-6 text-xs font-medium uppercase tracking-[0.08em] text-faint">
          {t.menu.settings}
        </p>
        <div className="space-y-0.5">
          <div className="flex min-h-16 items-center justify-between gap-3 px-3">
            <span className="font-semibold">{t.common.language}</span>
            <LangToggle />
          </div>
          <div className="flex min-h-16 items-center justify-between gap-3 px-3">
            <span className="font-semibold">{t.common.theme}</span>
            <ThemeToggle />
          </div>
        </div>

        <form action={signOut} className="mt-auto">
          <button
            type="submit"
            className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-full border border-line font-semibold text-bad transition-colors hover:bg-bad-soft"
          >
            <Glyph d={ICONS.logout} />
            {t.common.signOut}
          </button>
        </form>
      </div>
    </dialog>
  );
}

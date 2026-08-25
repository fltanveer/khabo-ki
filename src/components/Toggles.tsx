"use client";

import { useSyncExternalStore, useTransition } from "react";
import { LANG_LABEL, LANGS, type Lang } from "@/lib/i18n";
import { setLanguage } from "@/app/lang-actions";
import { useI18n } from "./I18nProvider";

type Mode = "light" | "dark";

// The boot script sets data-theme before hydration, so the DOM — not React —
// is the source of truth. Subscribing to it keeps the two in step without
// setting state from an effect.
const themeStore = {
  subscribe(onChange: () => void) {
    window.addEventListener("themechange", onChange);
    return () => window.removeEventListener("themechange", onChange);
  },
  get(): Mode {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  },
};

export function ThemeToggle() {
  const { t } = useI18n();
  const mode = useSyncExternalStore(themeStore.subscribe, themeStore.get, () => "light" as Mode);

  function toggle() {
    const next: Mode = mode === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode — the choice just won't persist.
    }
    window.dispatchEvent(new Event("themechange"));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${t.common.theme}: ${mode === "dark" ? t.common.dark : t.common.light}`}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink transition active:scale-95"
    >
      {mode === "dark" ? (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}

export function LangToggle() {
  const { lang } = useI18n();
  const [pending, startTransition] = useTransition();

  function choose(next: Lang) {
    if (next === lang || pending) return;
    startTransition(() => setLanguage(next));
  }

  return (
    <div className="flex shrink-0 items-center rounded-full border border-line bg-surface p-0.5">
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          aria-pressed={code === lang}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            code === lang ? "bg-brand text-on-brand" : "text-muted"
          }`}
        >
          {code === "en" ? "EN" : LANG_LABEL.bn}
        </button>
      ))}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { useI18n } from "./I18nProvider";
import { LangToggle, ThemeToggle } from "./Toggles";
import { Logo } from "./Tiffin";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-5">
      <div className="mb-auto flex items-center justify-end gap-2">
        <LangToggle />
        <ThemeToggle compact />
      </div>

      <div className="pb-7 pt-10">
        <Logo alt={t.appName} className="mb-7 h-12 w-auto" />
        <h1 className="font-display text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.01em] text-balance">
          {title}
        </h1>
        {subtitle && <p className="mt-2.5 text-[0.95rem] leading-relaxed text-muted">{subtitle}</p>}
      </div>

      {children}

      <div className="mb-auto mt-5 text-center text-sm text-muted">{footer}</div>
    </main>
  );
}

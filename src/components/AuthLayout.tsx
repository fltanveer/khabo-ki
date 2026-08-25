"use client";

import type { ReactNode } from "react";
import { useI18n } from "./I18nProvider";
import { LangToggle, ThemeToggle } from "./Toggles";

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
        <ThemeToggle />
      </div>

      <div className="py-8">
        <p className="mb-1.5 text-sm font-medium text-brand">{t.appName}</p>
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>

      {children}

      <div className="mb-auto mt-5 text-center text-sm text-muted">{footer}</div>
    </main>
  );
}

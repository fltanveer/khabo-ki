"use client";

import { createContext, useContext } from "react";
import { fill, formatNumber, itemName, type Dictionary, type Lang } from "@/lib/i18n";

type Ctx = {
  lang: Lang;
  t: Dictionary;
  f: (template: string, values: Record<string, string | number>) => string;
  n: (value: number) => string;
  dish: (item: { name: string; name_bn?: string | null }) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({
  lang,
  dict,
  children,
}: {
  lang: Lang;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const value: Ctx = {
    lang,
    t: dict,
    f: (template, values) => fill(template, values, lang),
    n: (value) => formatNumber(value, lang),
    dish: (item) => itemName(item, lang),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

import { en, type Dictionary } from "./en";
import { bn } from "./bn";

export type Lang = "en" | "bn";
export type { Dictionary };

export const LANGS: Lang[] = ["en", "bn"];
export const LANG_LABEL: Record<Lang, string> = { en: "English", bn: "বাংলা" };
export const LANG_COOKIE = "lang";

const DICTIONARIES: Record<Lang, Dictionary> = { en, bn };

export function getDictionary(lang: Lang): Dictionary {
  return DICTIONARIES[lang] ?? en;
}

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "bn";
}

// Fills {name} placeholders. Numbers are localised too, so Bangla shows ৩ not 3.
export function fill(
  template: string,
  values: Record<string, string | number>,
  lang: Lang = "en",
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    if (value === undefined) return `{${key}}`;
    return typeof value === "number" ? formatNumber(value, lang) : value;
  });
}

export function formatNumber(value: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-GB").format(value);
}

// Items carry an optional Bangla name; one-off dishes typed by staff won't.
export function itemName(
  item: { name: string; name_bn?: string | null },
  lang: Lang,
): string {
  return lang === "bn" && item.name_bn ? item.name_bn : item.name;
}

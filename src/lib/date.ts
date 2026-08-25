// The office runs on one timezone; the DB agrees (app.tz()). Never rely on the
// viewer's local clock for "today" or for cutoff maths.
export const APP_TZ = "Asia/Dhaka";

type Lang = "en" | "bn";

// Bangla gets Bengali numerals and month names; everything still renders in
// office time regardless of where the viewer is.
const locale = (lang: Lang = "en") => (lang === "bn" ? "bn-BD" : "en-GB");

export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ }).format(new Date());
}

export function formatDate(iso: string, lang: Lang = "en"): string {
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: APP_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function formatTime(iso: string, lang: Lang = "en"): string {
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: APP_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, lang: Lang = "en"): string {
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: APP_TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

// Build a timestamptz for "HH:MM on this menu_date, office time".
export function cutoffFor(menuDate: string, hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  // Probe the UTC offset the office timezone had on that date.
  const probe = new Date(`${menuDate}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TZ,
    timeZoneName: "longOffset",
  }).formatToParts(probe);
  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const offset = raw.replace("GMT", "") || "+00:00";
  const pad = (n: number) => String(n).padStart(2, "0");
  return new Date(`${menuDate}T${pad(h)}:${pad(m)}:00${offset}`).toISOString();
}

export function isPast(iso: string): boolean {
  return new Date(iso).getTime() <= Date.now();
}

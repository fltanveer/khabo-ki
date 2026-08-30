import { formatNumber, type Lang } from "@/lib/i18n";
import { APP_TZ } from "@/lib/date";

// Taka has no subunit in practice here — everything is whole numbers, and the
// split maths depends on that staying true.
export function formatMoney(amount: number, lang: Lang = "en"): string {
  return `৳${formatNumber(Math.round(amount), lang)}`;
}

// First of the month, in office time. This is the key every meal bill and
// every monthly payment is filed under.
export function monthKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  return `${year}-${month}-01`;
}

export function monthLabel(key: string, lang: Lang = "en"): string {
  return new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${key}T00:00:00Z`));
}

export function shiftMonth(key: string, by: number): string {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + by, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

// Mirrors the event_shares view so the browser can show a split reflowing as
// someone types, without a round trip. The database stays the authority — this
// is only ever a preview, and the two must agree.
export function previewSplit(
  total: number,
  participants: { id: string; rsvp: string; custom: number | null }[],
): Map<string, number> {
  const shares = new Map<string, number>();
  const going = participants.filter((p) => p.rsvp === "in");
  const custom = going.filter((p) => p.custom !== null);
  const even = going
    .filter((p) => p.custom === null)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const customTotal = custom.reduce((sum, p) => sum + (p.custom ?? 0), 0);
  const remaining = Math.max(total - customTotal, 0);
  const base = even.length > 0 ? Math.floor(remaining / even.length) : 0;
  const remainder = even.length > 0 ? remaining % even.length : 0;

  for (const p of participants) shares.set(p.id, 0);
  for (const p of custom) shares.set(p.id, p.custom ?? 0);
  even.forEach((p, index) => shares.set(p.id, base + (index === 0 ? remainder : 0)));

  return shares;
}

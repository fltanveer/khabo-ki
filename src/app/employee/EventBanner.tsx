import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { formatDateTime } from "@/lib/date";

// A party popper drawn on the same grid and stroke as the tab icons, instead of
// an emoji that renders differently on every phone.
function Popper({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20 8.5 8.5l7 7L4 20Z" />
      <path d="M13 6.5c.6-1.6 0-3 0-3M17.5 11c1.6-.6 3 0 3 0M15 9l3.5-3.5M19 3.5v.01M21 7v.01M10.5 3v.01" />
    </svg>
  );
}

// There is no push channel here, and there doesn't need to be — everyone opens
// this screen every morning to order lunch. That makes it the one place an
// announcement is guaranteed to be seen, which is worth making it loud.
export async function EventBanner() {
  const profile = await getProfile();
  if (!profile) return null;

  const { lang, t } = await getI18n();
  const supabase = await createClient();

  const { data } = await supabase
    .from("events")
    .select("id, title, event_at, cost_mode, event_participants!inner(rsvp, employee_id)")
    .eq("status", "announced")
    .gte("event_at", new Date().toISOString())
    .eq("event_participants.employee_id", profile.id)
    .order("event_at")
    .limit(3);

  const events = (data ?? []) as unknown as {
    id: string;
    title: string;
    event_at: string;
    cost_mode: "treat" | "shared";
    event_participants: { rsvp: string }[];
  }[];

  if (events.length === 0) return null;

  // Anything still waiting on an answer goes first. Sorting purely by date
  // buries the one card that actually wants something from you underneath the
  // ones you have already dealt with.
  const ordered = [...events].sort((a, b) => {
    const aWaiting = (a.event_participants[0]?.rsvp ?? "pending") === "pending";
    const bWaiting = (b.event_participants[0]?.rsvp ?? "pending") === "pending";
    if (aWaiting !== bWaiting) return aWaiting ? -1 : 1;
    return a.event_at.localeCompare(b.event_at);
  });

  return (
    <div className="mb-5 space-y-2.5">
      {ordered.map((event) => {
        const rsvp = event.event_participants[0]?.rsvp ?? "pending";
        const needsReply = rsvp === "pending";

        // One unanswered party gets the full treatment. Once you've replied it
        // steps back to a quiet card — three shouting banners in a row would
        // just be noise, and the answered ones are only a reminder.
        return needsReply ? (
          <Link
            key={event.id}
            href={`/employee/events/${event.id}`}
            className="announce group block rounded-card px-4 py-4 text-white transition-transform active:scale-[0.99] sm:px-5"
          >
            <div className="flex items-center gap-3.5">
              <span
                aria-hidden="true"
                className="announce-emoji grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur-sm"
              >
                <Popper className="h-6 w-6" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.95rem] font-semibold leading-snug">
                  {event.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/88">
                  {formatDateTime(event.event_at, lang)}
                  {event.cost_mode === "treat" ? ` · ${t.events.treatShort}` : ""}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--party-2)]">
                {t.events.rsvpAsk}
              </span>
            </div>
          </Link>
        ) : (
          <Link
            key={event.id}
            href={`/employee/events/${event.id}`}
            className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 transition hover:bg-raised"
          >
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, var(--party-1), var(--party-3))",
              }}
            >
              <Popper className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{event.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {formatDateTime(event.event_at, lang)}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-muted">
              {rsvp === "in" ? t.events.youreGoing : t.events.youreOut}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

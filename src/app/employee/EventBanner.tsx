import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { formatDateTime } from "@/lib/date";

// There is no push channel here, and there doesn't need to be — everyone opens
// this screen every morning to order lunch. That makes it the one place an
// announcement is guaranteed to be seen.
export async function EventBanner() {
  const profile = await getProfile();
  if (!profile) return null;

  const { lang, t } = await getI18n();
  const supabase = await createClient();

  const { data } = await supabase
    .from("events")
    .select("id, title, event_at, event_participants!inner(rsvp, employee_id)")
    .eq("status", "announced")
    .gte("event_at", new Date().toISOString())
    .eq("event_participants.employee_id", profile.id)
    .order("event_at")
    .limit(3);

  const events = (data ?? []) as unknown as {
    id: string;
    title: string;
    event_at: string;
    event_participants: { rsvp: string }[];
  }[];

  if (events.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {events.map((event) => {
        const needsReply = event.event_participants[0]?.rsvp === "pending";
        return (
          <Link
            key={event.id}
            href={`/employee/events/${event.id}`}
            className={`flex items-center gap-3 rounded-card border px-4 py-3 transition hover:bg-raised ${
              needsReply ? "border-brand/45 bg-brand-soft" : "border-line bg-surface"
            }`}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              🎉
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{event.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {formatDateTime(event.event_at, lang)}
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-brand">
              {needsReply ? t.events.rsvpAsk : t.events.bannerAction}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

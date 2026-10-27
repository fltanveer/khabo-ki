"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/components/I18nProvider";
import { Tiffin } from "@/components/Tiffin";

// A shared 20-second tick. The server has no idea what the viewer's clock says,
// so it renders the cutoff as a clock time and the countdown takes over once
// the page is live — no hydration mismatch, no setState in an effect.
const clock = {
  subscribe(onTick: () => void) {
    const id = window.setInterval(onTick, 20_000);
    return () => window.clearInterval(id);
  },
  get: () => Math.floor(Date.now() / 20_000),
  server: () => null,
};

// The countdown window the progress line represents. Menus go up in the
// morning and close around midday, so three hours covers the useful stretch.
const WINDOW_MINUTES = 180;

// The Today hero: the one big number on the screen is how long is left to
// decide, because that's the only thing that changes what you do next.
export function CutoffHero({
  cutoffIso,
  cutoff,
  picked,
  message,
}: {
  cutoffIso: string;
  cutoff: string;
  picked: boolean;
  message: string;
}) {
  const { t, f, n } = useI18n();
  const tick = useSyncExternalStore(clock.subscribe, clock.get, clock.server);

  const minutes =
    tick === null
      ? null
      : Math.max(0, Math.ceil((new Date(cutoffIso).getTime() - tick * 20_000) / 60_000));
  const counting = minutes !== null && minutes < WINDOW_MINUTES;
  const urgent = counting && minutes <= 15;
  const left = counting ? Math.max(0.03, minutes / WINDOW_MINUTES) : 1;

  // "11:30 am" → the time big, the meridiem small and muted.
  const [clockTime, ...meridiem] = cutoff.split(" ");

  return (
    <section className="relative mb-7 overflow-hidden rounded-card bg-surface p-6 shadow-[var(--shadow-card)]">
      <Tiffin
        mood={picked ? "happy" : "waiting"}
        className="pointer-events-none absolute -bottom-6 -right-3 h-40 w-28 rotate-[8deg]"
      />

      <p className="text-sm font-light italic text-muted">
        {counting ? t.employee.closesIn : f(t.employee.closesAt, { time: "" }).trim()}
      </p>

      <p className={`metric mt-3 text-[4.75rem] ${urgent ? "text-bad" : "text-ink"}`}>
        {counting ? (
          minutes >= 60 ? (
            <>
              {n(Math.floor(minutes / 60))}
              <span className="unit">{t.employee.unitHour}</span>{" "}
              {n(minutes % 60).padStart(2, n(0))}
              <span className="unit">{t.employee.unitMin}</span>
            </>
          ) : (
            <>
              {n(minutes)}
              <span className="unit">{t.employee.unitMin}</span>
            </>
          )
        ) : (
          <>
            {clockTime}
            {meridiem.length > 0 && <span className="unit">{meridiem.join(" ")}</span>}
          </>
        )}
      </p>

      {/* 2px track; the turmeric part is the time still left in the window. */}
      <div className="mt-6 h-0.5 w-[62%] rounded-full bg-line">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${urgent ? "bg-bad" : "bg-brand"}`}
          style={{ width: `${left * 100}%` }}
        />
      </div>

      <p className="mt-4 max-w-[30ch] pr-16 text-sm leading-relaxed text-muted">
        {counting && <span className="font-semibold text-ink">{f(t.employee.closesAt, { time: cutoff })} · </span>}
        {message}
      </p>
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { savePickRules, toggleBan } from "../actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { Badge, Button, Card, Empty, List, Notice, Row, Section } from "@/components/ui";

type Item = { id: string; name: string; name_bn: string | null };

function Arrow({ dir }: { dir: "up" | "down" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "up" ? "M12 19V5M6 11l6-6 6 6" : "M12 5v14M6 13l6 6 6-6"} />
    </svg>
  );
}

export function PreferencesEditor({
  items,
  initialBans,
  initialRanked,
}: {
  items: Item[];
  initialBans: string[];
  initialRanked: string[];
}) {
  const { t, n, dish } = useI18n();
  const errorText = useErrorText();
  const [bans, setBans] = useState<string[]>(initialBans);
  const [ranked, setRanked] = useState<string[]>(initialRanked);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const byId = new Map(items.map((item) => [item.id, item]));
  const rankedItems = ranked.flatMap((id) => byId.get(id) ?? []);
  const unranked = items.filter((item) => !ranked.includes(item.id) && !bans.includes(item.id));

  function persist(next: string[]) {
    setRanked(next);
    setSaved(false);
    setError("");
    startTransition(async () => {
      const result = await savePickRules(next);
      if (result.error) setError(errorText(result.error));
      else setSaved(true);
    });
  }

  function move(index: number, delta: number) {
    const next = [...ranked];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  }

  function onToggleBan(itemId: string, banned: boolean) {
    setError("");
    setBans((prev) => (banned ? [...prev, itemId] : prev.filter((id) => id !== itemId)));
    // A banned dish can never be auto-picked, so drop it from the ranking too.
    if (banned && ranked.includes(itemId)) {
      setRanked((prev) => prev.filter((id) => id !== itemId));
    }
    startTransition(async () => {
      const result = await toggleBan(itemId, banned);
      if (result.error) setError(errorText(result.error));
    });
  }

  return (
    <div>
      {error && (
        <div className="mb-4">
          <Notice>{error}</Notice>
        </div>
      )}

      <Section
        title={t.prefs.autoTitle}
        description={t.prefs.autoBody}
        aside={saved && !pending ? <Badge tone="good">{t.prefs.saved}</Badge> : undefined}
      >
        <Card>
          {rankedItems.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted">{t.prefs.nothingRanked}</p>
          ) : (
            <ol className="space-y-2">
              {rankedItems.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-raised px-3 py-2.5"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-on-brand">
                    {n(index + 1)}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">{dish(item)}</span>
                  <button
                    type="button"
                    aria-label={t.prefs.moveUp}
                    disabled={pending || index === 0}
                    onClick={() => move(index, -1)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink disabled:opacity-30"
                  >
                    <Arrow dir="up" />
                  </button>
                  <button
                    type="button"
                    aria-label={t.prefs.moveDown}
                    disabled={pending || index === rankedItems.length - 1}
                    onClick={() => move(index, 1)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink disabled:opacity-30"
                  >
                    <Arrow dir="down" />
                  </button>
                  <button
                    type="button"
                    aria-label={t.common.remove}
                    disabled={pending}
                    onClick={() => persist(ranked.filter((id) => id !== item.id))}
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-bad"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ol>
          )}

          {unranked.length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                {t.prefs.addToRanking}
              </p>
              <div className="flex flex-wrap gap-2">
                {unranked.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={pending}
                    onClick={() => persist([...ranked, item.id])}
                    className="rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium transition hover:border-brand hover:text-brand disabled:opacity-45"
                  >
                    + {dish(item)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </Section>

      <Section title={t.prefs.bansTitle} description={t.prefs.bansBody}>
        {items.length === 0 ? (
          <Empty>{t.prefs.emptyLibrary}</Empty>
        ) : (
          <List>
            {items.map((item) => {
              const banned = bans.includes(item.id);
              return (
                <Row key={item.id}>
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${
                      banned ? "text-muted line-through" : "font-medium"
                    }`}
                  >
                    {dish(item)}
                  </span>
                  <Button
                    variant={banned ? "secondary" : "danger"}
                    size="sm"
                    disabled={pending}
                    onClick={() => onToggleBan(item.id, !banned)}
                  >
                    {banned ? t.prefs.unban : t.prefs.ban}
                  </Button>
                </Row>
              );
            })}
          </List>
        )}
      </Section>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { savePickRules, toggleBan } from "../actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { Badge, Button, Card, Empty, List, Notice, Row, Section } from "@/components/ui";
import { RankedList } from "./RankedList";

type Item = { id: string; name: string; name_bn: string | null };

export function PreferencesEditor({
  items,
  initialBans,
  initialRanked,
}: {
  items: Item[];
  initialBans: string[];
  initialRanked: string[];
}) {
  const { t, dish } = useI18n();
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
            <RankedList
              items={rankedItems}
              disabled={pending}
              onReorder={persist}
              onRemove={(id) => persist(ranked.filter((x) => x !== id))}
            />
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
                    className="rounded-full border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium transition hover:border-brand hover:text-brand disabled:opacity-45"
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

"use client";

import { useState, useTransition } from "react";
import { savePickRules, toggleBan } from "../actions";
import { Badge, Button, Card, Empty, Notice } from "@/components/ui";

type Item = { id: string; name: string };

export function PreferencesEditor({
  items,
  initialBans,
  initialRanked,
}: {
  items: Item[];
  initialBans: string[];
  initialRanked: string[];
}) {
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
      if (result.error) setError(result.error);
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
    // A banned item can never be auto-picked, so drop it from the ranking too.
    if (banned && ranked.includes(itemId)) {
      setRanked((prev) => prev.filter((id) => id !== itemId));
    }
    startTransition(async () => {
      const result = await toggleBan(itemId, banned);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-8">
      <Notice>{error}</Notice>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Auto-pick order</h2>
        <p className="mb-3 text-sm text-muted">
          When a menu is published we order the highest item on this list that&apos;s available
          that day. You can still change it by hand before cutoff.
        </p>

        <Card>
          {rankedItems.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing ranked yet. Add items below and you&apos;ll be seated automatically.
            </p>
          ) : (
            <ol className="space-y-2">
              {rankedItems.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-line px-3 py-2"
                >
                  <Badge>{index + 1}</Badge>
                  <span className="flex-1 text-sm">{item.name}</span>
                  <Button variant="ghost" disabled={pending || index === 0} onClick={() => move(index, -1)}>
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={pending || index === rankedItems.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() => persist(ranked.filter((id) => id !== item.id))}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ol>
          )}

          {unranked.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              {unranked.map((item) => (
                <Button
                  key={item.id}
                  variant="secondary"
                  disabled={pending}
                  onClick={() => persist([...ranked, item.id])}
                >
                  + {item.name}
                </Button>
              ))}
            </div>
          )}

          {saved && <p className="mt-3 text-sm text-good">Saved.</p>}
        </Card>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Banned items</h2>
        <p className="mb-3 text-sm text-muted">
          Banned items never show on your menu and are never auto-picked. Unban any time.
        </p>

        {items.length === 0 ? (
          <Empty>The item library is empty.</Empty>
        ) : (
          <Card>
            <ul className="divide-y divide-line">
              {items.map((item) => {
                const banned = bans.includes(item.id);
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                    <span className={`text-sm ${banned ? "text-muted line-through" : ""}`}>
                      {item.name}
                    </span>
                    <Button
                      variant={banned ? "secondary" : "danger"}
                      disabled={pending}
                      onClick={() => onToggleBan(item.id, !banned)}
                    >
                      {banned ? "Unban" : "Ban"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

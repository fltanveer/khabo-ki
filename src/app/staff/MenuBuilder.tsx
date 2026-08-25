"use client";

import { useState, useTransition } from "react";
import {
  addOneOffDish,
  lockMenu,
  publishMenu,
  setCutoff,
  syncMenuItems,
} from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { Badge, Button, Card, Input, Notice, Section } from "@/components/ui";

type Item = { id: string; name: string; name_bn: string | null };

function Tick({ on }: { on: boolean }) {
  return (
    <span
      className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border transition ${
        on ? "border-brand bg-brand text-on-brand" : "border-2 border-line-strong bg-surface"
      }`}
    >
      {on && (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 13 4 4L19 7" />
        </svg>
      )}
    </span>
  );
}

export function MenuBuilder({
  menuId,
  menuDate,
  cutoffHHMM,
  published,
  lockedEarly,
  orderingClosed,
  library,
  initialSelected,
}: {
  menuId: string;
  menuDate: string;
  cutoffHHMM: string;
  published: boolean;
  lockedEarly: boolean;
  orderingClosed: boolean;
  library: Item[];
  initialSelected: string[];
}) {
  const { t, f, n, dish } = useI18n();
  const errorText = useErrorText();

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [savedSet, setSavedSet] = useState<string[]>(initialSelected);
  const [newName, setNewName] = useState("");
  const [cutoff, setCutoffValue] = useState(cutoffHHMM);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const dirty =
    selected.length !== savedSet.length || selected.some((id) => !savedSet.includes(id));

  function toggle(id: string) {
    setMessage("");
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function run(fn: () => Promise<{ error?: Parameters<typeof errorText>[0]; orphaned?: number }>, after?: () => void) {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        setError(errorText(result.error));
        return;
      }
      after?.();
      if (result.orphaned) {
        setMessage(f(t.staff.orphaned, { count: result.orphaned }));
      }
    });
  }

  function saveMenu() {
    const next = [...selected];
    run(
      () => syncMenuItems(menuId, next),
      () => {
        setSavedSet(next);
        setMessage(t.staff.menuSaved);
      },
    );
  }

  return (
    <div>
      <div className="mb-4 space-y-2">
        <Notice>{error}</Notice>
        <Notice tone="good">{message}</Notice>
      </div>

      <Section
        title={t.staff.pickDishes}
        description={t.staff.pickDishesBody}
        aside={
          !published ? (
            <Badge tone="warn">{t.staff.draft}</Badge>
          ) : orderingClosed ? (
            <Badge tone="bad">{t.staff.orderingClosed}</Badge>
          ) : (
            <Badge tone="good">{t.staff.published}</Badge>
          )
        }
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          {library.map((item) => {
            const on = selected.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={orderingClosed}
                  aria-pressed={on}
                  onClick={() => toggle(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3.5 text-left transition active:scale-[0.99] disabled:opacity-55 ${
                    on ? "border-brand bg-brand-soft" : "border-line-strong bg-surface hover:border-brand"
                  }`}
                >
                  <Tick on={on} />
                  <span className={`text-[0.95rem] ${on ? "font-semibold" : "font-medium"}`}>
                    {dish(item)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {!orderingClosed && (
          <Card className="mt-4">
            <p className="mb-2 text-sm font-medium">{t.staff.oneOff}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input
                  value={newName}
                  placeholder={t.staff.oneOffPlaceholder}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                disabled={pending || newName.trim().length < 2}
                onClick={() =>
                  run(
                    async () => {
                      const result = await addOneOffDish(newName);
                      // A brand-new dish should arrive already ticked.
                      if (result.itemId) {
                        setSelected((prev) =>
                          prev.includes(result.itemId!) ? prev : [...prev, result.itemId!],
                        );
                        setNewName("");
                      }
                      return result;
                    },
                  )
                }
              >
                {t.staff.oneOffAdd}
              </Button>
            </div>
          </Card>
        )}
      </Section>

      <Section title={t.staff.cutoff}>
        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-40">
              <Input
                label={t.staff.cutoffLabel}
                type="time"
                value={cutoff}
                disabled={lockedEarly}
                onChange={(e) => setCutoffValue(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              disabled={pending || lockedEarly || cutoff === cutoffHHMM}
              onClick={() => run(() => setCutoff(menuId, menuDate, cutoff))}
            >
              {t.staff.saveCutoff}
            </Button>
          </div>
        </Card>
      </Section>

      {published && !lockedEarly && !orderingClosed && (
        <Button variant="secondary" disabled={pending} onClick={() => run(() => lockMenu(menuId))}>
          {t.staff.closeNow}
        </Button>
      )}

      {/* The primary action follows the thumb on mobile and stays visible. */}
      <div
        className="fixed inset-x-0 bottom-[4.25rem] z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-md md:static md:mt-6 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <span className="text-sm text-muted md:hidden">
            {f(t.staff.selected, { count: selected.length })}
          </span>
          <div className="ml-auto flex gap-2">
            {dirty && (
              <Button disabled={pending} onClick={saveMenu}>
                {pending ? t.common.saving : t.staff.saveMenu}
              </Button>
            )}
            {!published && (
              <Button
                variant={dirty ? "secondary" : "primary"}
                disabled={pending || selected.length === 0}
                onClick={() =>
                  run(
                    async () => {
                      // Publishing an unsaved selection would ship the wrong menu.
                      if (dirty) {
                        const sync = await syncMenuItems(menuId, selected);
                        if (sync.error) return sync;
                        setSavedSet([...selected]);
                      }
                      const result = await publishMenu(menuId);
                      if (!result.error) {
                        setMessage(f(t.staff.publishResult, { count: result.autoPicks ?? 0 }));
                      }
                      return result;
                    },
                  )
                }
              >
                {t.staff.publish}
              </Button>
            )}
          </div>
        </div>
        <p className="mx-auto mt-1 hidden max-w-4xl text-right text-xs text-muted md:block">
          {f(t.staff.selected, { count: selected.length })} · {n(library.length)}
        </p>
      </div>
    </div>
  );
}

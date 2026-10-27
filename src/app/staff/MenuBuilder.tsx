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
import { Button, Input, Notice, Section } from "@/components/ui";
import { Sheet } from "@/components/Sheet";

type Item = { id: string; name: string; name_bn: string | null };

function Tick({ on }: { on: boolean }) {
  return (
    <span
      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition ${
        on ? "bg-brand text-on-brand" : "border-[1.5px] border-line-strong"
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
  orderCount,
}: {
  menuId: string;
  menuDate: string;
  cutoffHHMM: string;
  published: boolean;
  lockedEarly: boolean;
  orderingClosed: boolean;
  library: Item[];
  initialSelected: string[];
  orderCount: number;
}) {
  const { t, f, n, dish } = useI18n();
  const errorText = useErrorText();

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [savedSet, setSavedSet] = useState<string[]>(initialSelected);
  const [newName, setNewName] = useState("");
  const [cutoff, setCutoffValue] = useState(cutoffHHMM);
  const [addingDish, setAddingDish] = useState(false);
  const [editingCutoff, setEditingCutoff] = useState(false);
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

  const statusTone = !published ? "bg-warn" : orderingClosed ? "bg-bad" : "bg-good";
  const statusLabel = !published
    ? t.staff.draft
    : orderingClosed
      ? t.staff.orderingClosed
      : t.staff.published;

  function addOneOff() {
    run(async () => {
      const result = await addOneOffDish(newName);
      // A brand-new dish should arrive already ticked.
      if (result.itemId) {
        setSelected((prev) =>
          prev.includes(result.itemId!) ? prev : [...prev, result.itemId!],
        );
        setNewName("");
        setAddingDish(false);
      }
      return result;
    });
  }

  return (
    <div>
      <div className="mb-4 space-y-2">
        <Notice>{error}</Notice>
        <Notice tone="good">{message}</Notice>
      </div>

      {/* The hero: one number that says where the day stands — orders once
          it's live, dishes picked while it's still a draft. */}
      <section className="mb-7 rounded-card bg-surface p-6 shadow-[var(--shadow-card)]">
        <p className="flex items-center gap-1.5 text-sm font-light italic text-muted">
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${statusTone}`} />
          {statusLabel}
        </p>
        <p className="metric mt-3 text-[4.5rem]">
          {n(published ? orderCount : selected.length)}
          <span className="unit">{published ? t.staff.ordersUnit : t.staff.dishesUnit}</span>
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div>
            <p className="text-xs text-muted">{t.staff.cutoffLabel}</p>
            <p className="mt-0.5 text-xl font-medium tabular-nums">{cutoffHHMM}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!lockedEarly && !orderingClosed && (
              <Button
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setCutoffValue(cutoffHHMM);
                  setEditingCutoff(true);
                }}
              >
                {t.common.change}
              </Button>
            )}
            {published && !lockedEarly && !orderingClosed && (
              <Button
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => run(() => lockMenu(menuId))}
              >
                {t.staff.closeNow}
              </Button>
            )}
          </div>
        </div>
      </section>

      <Section title={t.staff.pickDishes} description={t.staff.pickDishesBody}>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {library.map((item) => {
            const on = selected.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={orderingClosed}
                  aria-pressed={on}
                  onClick={() => toggle(item.id)}
                  className={`flex min-h-16 w-full items-center gap-3.5 rounded-[1.5rem] border-2 px-4 py-3 text-left transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.985] disabled:opacity-55 ${
                    on
                      ? "border-ink bg-ink text-bg"
                      : "border-transparent bg-surface shadow-[var(--shadow-card)] hover:border-line"
                  }`}
                >
                  <Tick on={on} />
                  <span className="text-[1.05rem] font-medium leading-snug">{dish(item)}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {!orderingClosed && (
          <Button variant="secondary" block className="mt-3" onClick={() => setAddingDish(true)}>
            + {t.staff.oneOffOpen}
          </Button>
        )}
      </Section>

      <Sheet
        open={addingDish}
        onClose={() => setAddingDish(false)}
        title={t.staff.oneOff}
        footer={
          <>
            <Button
              variant="secondary"
              className="shrink-0 px-6"
              disabled={pending}
              onClick={() => setAddingDish(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              className="flex-1"
              disabled={pending || newName.trim().length < 2}
              onClick={addOneOff}
            >
              {t.staff.oneOffAdd}
            </Button>
          </>
        }
      >
        <Input
          value={newName}
          placeholder={t.staff.oneOffPlaceholder}
          onChange={(e) => setNewName(e.target.value)}
        />
        {addingDish && <Notice>{error}</Notice>}
      </Sheet>

      <Sheet
        open={editingCutoff}
        onClose={() => setEditingCutoff(false)}
        title={t.staff.cutoff}
        footer={
          <>
            <Button
              variant="secondary"
              className="shrink-0 px-6"
              disabled={pending}
              onClick={() => setEditingCutoff(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              className="flex-1"
              disabled={pending || cutoff === cutoffHHMM}
              onClick={() =>
                run(
                  () => setCutoff(menuId, menuDate, cutoff),
                  () => setEditingCutoff(false),
                )
              }
            >
              {t.staff.saveCutoff}
            </Button>
          </>
        }
      >
        <Input
          label={t.staff.cutoffLabel}
          type="time"
          value={cutoff}
          onChange={(e) => setCutoffValue(e.target.value)}
        />
        {editingCutoff && <Notice>{error}</Notice>}
      </Sheet>

      {/* Keeps the last dish clear of the floating bar on phones. */}
      <div aria-hidden="true" className="h-24 md:hidden" />

      {/* The primary action floats above the nav capsule, within thumb reach. */}
      <div
        className="fixed inset-x-3 z-20 md:static md:inset-auto md:mt-6"
        style={{ bottom: "calc(4rem + 1.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-xl items-center gap-3 rounded-full bg-surface/90 p-2 pl-5 shadow-float backdrop-blur-xl md:max-w-none">
          <span className="min-w-0 flex-1 text-sm font-medium text-muted">
            {f(t.staff.selected, { count: selected.length })}
            <span className="hidden md:inline"> · {n(library.length)}</span>
          </span>
          {dirty && (
            <Button disabled={pending} onClick={saveMenu}>
              {pending ? t.common.saving : t.staff.saveMenu}
            </Button>
          )}
          {!published && (
            <Button
              variant={dirty ? "secondary" : "accent"}
              disabled={pending || selected.length === 0}
              onClick={() =>
                run(async () => {
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
                })
              }
            >
              {t.staff.publish}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useOptimistic, useState, useTransition } from "react";
import { clearPick, pickItem } from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { Badge, Button, Notice } from "@/components/ui";

export type PickableItem = { id: string; name: string; name_bn: string | null };

function Check() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-on-brand">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 13 4 4L19 7" />
      </svg>
    </span>
  );
}

export function MenuPicker({
  menuId,
  items,
  currentItemId,
  source,
  confirmed,
  open,
  cutoff,
}: {
  menuId: string;
  items: PickableItem[];
  currentItemId: string | null;
  source: "manual" | "auto" | null;
  confirmed: boolean;
  open: boolean;
  cutoff: string;
}) {
  const { t, f, dish } = useI18n();
  const errorText = useErrorText();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // What the server has stored. useOptimistic holds the new value until the
  // refreshed props arrive, so the row never flicks back mid-commit.
  // Only a confirmed order counts as stored. An auto-pick is a suggestion,
  // so it starts life staged — the employee still has to say yes to it, or
  // the office buys lunch for someone who never came in.
  const [confirmedId, setConfirmedId] = useOptimistic(
    confirmed ? currentItemId : null,
    (_current, next: string | null) => next,
  );

  // Tapping a dish only stages it; nothing is ordered until Confirm. null here
  // means "no local change", which is different from a staged clear.
  const [draft, setDraft] = useState<{ id: string | null } | null>(
    !confirmed && currentItemId ? { id: currentItemId } : null,
  );

  // True while the untouched auto suggestion is still on screen.
  const suggested = !confirmed && source === "auto" && currentItemId !== null;

  const selectedId = draft ? draft.id : confirmedId;
  const dirty = selectedId !== confirmedId;
  const selectedItem = items.find((i) => i.id === selectedId) ?? null;
  const showBar = open && (dirty || confirmedId !== null);

  function tap(itemId: string) {
    if (!open) return;
    setError("");
    setDraft({ id: itemId === selectedId ? null : itemId });
  }

  function confirm() {
    setError("");
    const next = selectedId;
    startTransition(async () => {
      setConfirmedId(next);
      const result = next === null ? await clearPick(menuId) : await pickItem(menuId, next);
      if (result.error) setError(errorText(result.error));
      setDraft(null);
    });
  }

  // "Not today" throws the suggestion away so it stops being offered, and
  // makes it explicit that this person is not eating.
  function clear() {
    setError("");
    startTransition(async () => {
      setConfirmedId(null);
      const result = await clearPick(menuId);
      if (result.error) setError(errorText(result.error));
      setDraft(null);
    });
  }

  return (
    <div className="space-y-3">
      <Notice>{error}</Notice>

      <ul className="grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => {
          const selected = item.id === selectedId;
          const staged = selected && dirty;
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={!open}
                aria-pressed={selected}
                onClick={() => tap(item.id)}
                className={`flex min-h-[4.5rem] w-full items-center justify-between gap-3 rounded-[1.5rem] border-2 py-3.5 pl-5 pr-4 text-left transition-[transform,background-color,border-color,color] duration-150 active:scale-[0.985] disabled:opacity-60 ${
                  selected
                    ? staged
                      ? "border-dashed border-ink bg-surface"
                      : "border-ink bg-ink text-bg"
                    : "border-transparent bg-surface shadow-[var(--shadow-card)] hover:border-line"
                }`}
              >
                <span className="text-[1.1rem] font-medium leading-snug">
                  {dish(item)}
                </span>
                {selected ? (
                  <span className="flex items-center gap-2">
                    {source === "auto" && (!dirty || suggested) && (
                      <Badge tone="brand">
                        {confirmed ? t.employee.autoPicked : t.employee.suggested}
                      </Badge>
                    )}
                    <Check />
                  </span>
                ) : (
                  <span className="h-8 w-8 shrink-0 rounded-full border-[1.5px] border-line-strong" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Keeps the last dish clear of the floating bar on phones. */}
      {showBar && <div aria-hidden="true" className="h-28 md:hidden" />}

      {showBar && (
        <div
          className="fixed inset-x-3 z-20 md:static md:inset-auto md:mt-5"
          style={{ bottom: "calc(4rem + 1.5rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-xl items-center gap-3 rounded-full bg-surface/90 p-2 pl-5 shadow-float backdrop-blur-xl md:max-w-none">
            {dirty ? (
              <>
                <span className="min-w-0 flex-1">
                  {selectedItem ? (
                    <>
                      <span className="block text-xs font-semibold text-muted">
                        {suggested && selectedId === currentItemId
                          ? t.employee.suggested
                          : t.employee.yourLunch}
                      </span>
                      <span className="block truncate font-semibold">{dish(selectedItem)}</span>
                    </>
                  ) : (
                    <span className="block text-sm leading-snug text-muted">
                      {t.employee.unconfirmed}
                    </span>
                  )}
                </span>
                {suggested && (
                  <Button variant="ghost" size="sm" disabled={pending} onClick={clear}>
                    {t.employee.notToday}
                  </Button>
                )}
                <Button variant="accent" disabled={pending} onClick={confirm}>
                  {pending ? t.employee.confirming : t.employee.confirmOrder}
                </Button>
              </>
            ) : (
              <>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-good-soft text-good">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {selectedItem ? dish(selectedItem) : t.employee.orderConfirmed}
                  </span>
                  <span className="block text-xs text-muted">
                    {t.employee.orderConfirmed} · {f(t.employee.changeHint, { time: cutoff })}
                  </span>
                </span>
                <Button variant="secondary" size="sm" disabled={pending} onClick={clear}>
                  {t.employee.clearPick}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

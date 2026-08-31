"use client";

import { useOptimistic, useState, useTransition } from "react";
import { clearPick, pickItem } from "./actions";
import { useI18n } from "@/components/I18nProvider";
import { useErrorText } from "@/components/useErrorText";
import { Badge, Button, Notice } from "@/components/ui";

export type PickableItem = { id: string; name: string; name_bn: string | null };

function Check() {
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-on-brand">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
                className={`flex w-full items-center justify-between gap-3 rounded-card border px-4 py-4 text-left transition active:scale-[0.99] disabled:opacity-60 ${
                  selected
                    ? staged
                      ? "border-brand border-dashed bg-brand-soft"
                      : "border-brand bg-brand-soft"
                    : "border-line-strong bg-surface hover:border-brand"
                }`}
              >
                <span className={`text-[0.95rem] ${selected ? "font-semibold" : "font-medium"}`}>
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
                  <span className="h-6 w-6 shrink-0 rounded-full border-2 border-line-strong" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {open && (dirty || confirmedId) && (
        <div
          className="fixed inset-x-0 bottom-[4.25rem] z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-md md:static md:mt-5 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            {dirty ? (
              <>
                <span className="min-w-0 flex-1 text-sm text-muted">
                  {suggested && selectedId === currentItemId
                    ? t.employee.suggestedBody
                    : t.employee.unconfirmed}
                </span>
                {suggested && (
                  <Button variant="ghost" size="sm" disabled={pending} onClick={clear}>
                    {t.employee.notToday}
                  </Button>
                )}
                <Button disabled={pending} onClick={confirm}>
                  {pending ? t.employee.confirming : t.employee.confirmOrder}
                </Button>
              </>
            ) : (
              <>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <Badge tone="good">{t.employee.orderConfirmed}</Badge>
                  <span className="text-xs text-muted">
                    {f(t.employee.changeHint, { time: cutoff })}
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

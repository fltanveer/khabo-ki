"use client";

import { useState, useTransition } from "react";
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
  open,
}: {
  menuId: string;
  items: PickableItem[];
  currentItemId: string | null;
  source: "manual" | "auto" | null;
  open: boolean;
}) {
  const { t, dish } = useI18n();
  const errorText = useErrorText();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  // Show the tap immediately; the server round-trip confirms it a moment later.
  const [optimistic, setOptimistic] = useState<string | null>(null);

  const selectedId = pending && optimistic !== null ? optimistic || null : currentItemId;

  function choose(itemId: string) {
    if (!open) return;
    setError("");
    const clearing = itemId === currentItemId;
    setOptimistic(clearing ? "" : itemId);
    startTransition(async () => {
      const result = clearing ? await clearPick(menuId) : await pickItem(menuId, itemId);
      if (result.error) setError(errorText(result.error));
      setOptimistic(null);
    });
  }

  return (
    <div className="space-y-3">
      <Notice>{error}</Notice>

      <ul className="grid gap-2.5 sm:grid-cols-2">
        {items.map((item) => {
          const selected = item.id === selectedId;
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={!open}
                aria-pressed={selected}
                onClick={() => choose(item.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-card border px-4 py-4 text-left transition active:scale-[0.99] disabled:opacity-60 ${
                  selected
                    ? "border-brand bg-brand-soft"
                    : "border-line-strong bg-surface hover:border-brand"
                }`}
              >
                <span className={`text-[0.95rem] ${selected ? "font-semibold" : "font-medium"}`}>
                  {dish(item)}
                </span>
                {selected ? (
                  <span className="flex items-center gap-2">
                    {source === "auto" && !pending && (
                      <Badge tone="brand">{t.employee.autoPicked}</Badge>
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

      {open && selectedId && (
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => choose(selectedId)}>
          {t.employee.clearPick}
        </Button>
      )}
    </div>
  );
}

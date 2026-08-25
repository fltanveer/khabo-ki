"use client";

import { useState, useTransition } from "react";
import { clearPick, pickItem } from "./actions";
import { Badge, Button, Notice } from "@/components/ui";

export type PickableItem = { id: string; name: string };

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
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function choose(itemId: string) {
    setError("");
    startTransition(async () => {
      const result = itemId === currentItemId ? await clearPick(menuId) : await pickItem(menuId, itemId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <Notice>{error}</Notice>

      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const selected = item.id === currentItemId;
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={!open || pending}
                onClick={() => choose(item.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? "border-brand bg-brand-soft font-medium"
                    : "border-line bg-surface hover:border-brand"
                }`}
              >
                <span>{item.name}</span>
                {selected && (
                  <Badge tone="good">{source === "auto" ? "auto-picked" : "your pick"}</Badge>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {open && currentItemId && (
        <Button variant="ghost" disabled={pending} onClick={() => choose(currentItemId)}>
          Clear my pick
        </Button>
      )}
    </div>
  );
}

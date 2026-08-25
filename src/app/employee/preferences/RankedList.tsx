"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/components/I18nProvider";

type Item = { id: string; name: string; name_bn?: string | null };

/**
 * Pointer-based sortable list. HTML5 drag-and-drop doesn't fire on touch, and
 * this list is used mostly on phones, so it tracks pointer events directly and
 * reorders as the pointer crosses each row's midpoint.
 *
 * The handle is a real button: dragging is a mouse/touch convenience, and
 * arrow keys do the same job for keyboard and screen-reader users.
 */
export function RankedList({
  items,
  disabled,
  onReorder,
  onRemove,
}: {
  items: Item[];
  disabled: boolean;
  onReorder: (next: string[]) => void;
  onRemove: (id: string) => void;
}) {
  const { t, n, dish } = useI18n();
  const listRef = useRef<HTMLOListElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  // Live order during a drag; committed on release.
  const [order, setOrder] = useState<string[] | null>(null);

  const shown = order ? order.flatMap((id) => items.filter((i) => i.id === id)) : items;

  function rowCentres(): { id: string; centre: number }[] {
    const list = listRef.current;
    if (!list) return [];
    return [...list.querySelectorAll<HTMLLIElement>("li[data-id]")].map((el) => ({
      id: el.dataset.id!,
      centre: el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2,
    }));
  }

  function onPointerDown(e: React.PointerEvent, id: string) {
    if (disabled) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragId(id);
    setOrder(shown.map((i) => i.id));
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragId || !order) return;

    const centres = rowCentres();
    const from = order.indexOf(dragId);
    const target = centres.findIndex((row, index) =>
      index === centres.length - 1 ? true : e.clientY < row.centre,
    );
    if (target === -1 || target === from) return;

    const next = [...order];
    next.splice(target, 0, ...next.splice(from, 1));
    setOrder(next);
  }

  function commit() {
    if (dragId && order) {
      const changed = order.some((id, i) => items[i]?.id !== id);
      if (changed) onReorder(order);
    }
    setDragId(null);
    setOrder(null);
  }

  function nudge(id: string, delta: number) {
    const current = items.map((i) => i.id);
    const from = current.indexOf(id);
    const to = from + delta;
    if (to < 0 || to >= current.length) return;
    const next = [...current];
    [next[from], next[to]] = [next[to], next[from]];
    onReorder(next);
  }

  return (
    <>
      <ol ref={listRef} className="space-y-2" onPointerMove={onPointerMove} onPointerUp={commit} onPointerCancel={commit}>
        {shown.map((item, index) => {
          const dragging = item.id === dragId;
          return (
            <li
              key={item.id}
              data-id={item.id}
              className={`flex items-center gap-2 rounded-xl border px-2 py-2 transition-[background,box-shadow,border-color] ${
                dragging
                  ? "border-brand bg-brand-soft shadow-lg"
                  : "border-line bg-raised"
              }`}
            >
              <button
                type="button"
                aria-label={`${t.prefs.reorder}: ${dish(item)}`}
                disabled={disabled}
                onPointerDown={(e) => onPointerDown(e, item.id)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    nudge(item.id, -1);
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    nudge(item.id, 1);
                  }
                }}
                className="grid h-10 w-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-ink active:cursor-grabbing disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <circle cx="9" cy="6" r="1.6" />
                  <circle cx="15" cy="6" r="1.6" />
                  <circle cx="9" cy="12" r="1.6" />
                  <circle cx="15" cy="12" r="1.6" />
                  <circle cx="9" cy="18" r="1.6" />
                  <circle cx="15" cy="18" r="1.6" />
                </svg>
              </button>

              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-on-brand">
                {n(index + 1)}
              </span>

              <span className="flex-1 truncate text-sm font-medium">{dish(item)}</span>

              <button
                type="button"
                aria-label={`${t.common.remove}: ${dish(item)}`}
                disabled={disabled}
                onClick={() => onRemove(item.id)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface hover:text-bad disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="mt-2.5 text-xs text-muted">{t.prefs.dragHint}</p>
    </>
  );
}

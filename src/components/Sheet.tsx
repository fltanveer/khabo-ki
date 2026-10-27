"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "./I18nProvider";

// The app's one overlay for tasks: a bottom sheet on phones, a centred card on
// wider screens. Built on <dialog> so focus is trapped, Escape closes it and the
// page behind goes inert without any of that being re-implemented here. The
// grabber can be dragged down to dismiss, the way native sheets behave.
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ startY: number; dy: number } | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.style.transform = "";
      dialog.showModal();
      // Land focus on the sheet, not its close button: Tab still reaches every
      // control, but the sheet doesn't open with a ring on the ×.
      dialog.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function onPointerDown(e: React.PointerEvent) {
    // Desktop shows a centred card; dragging only means something on a sheet.
    if (window.matchMedia("(min-width: 768px)").matches) return;
    drag.current = { startY: e.clientY, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const dialog = ref.current;
    if (!drag.current || !dialog) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.startY);
    dialog.style.transition = "none";
    dialog.style.transform = `translateY(${drag.current.dy}px)`;
  }

  function onPointerUp() {
    const dialog = ref.current;
    if (!drag.current || !dialog) return;
    const { dy } = drag.current;
    drag.current = null;
    dialog.style.transition = "";
    if (dy > 110) {
      // Let it carry on downward from where the finger left it.
      dialog.style.transform = "translateY(100%)";
      onClose();
    } else {
      dialog.style.transform = "";
    }
  }

  return (
    <dialog
      ref={ref}
      className="sheet"
      tabIndex={-1}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[inherit] flex-col">
        <div
          className="flex shrink-0 touch-none justify-center pb-2 pt-3 md:hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line-strong/50" />
        </div>

        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pb-4 md:pt-6">
          <div className="min-w-0">
            <h2 className="text-[1.375rem] font-medium leading-tight tracking-[-0.015em]">
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.cancel}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-raised text-ink transition active:scale-95"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 pb-2">
          {children}
        </div>

        {footer && (
          <div
            className="flex shrink-0 gap-3 px-6 pt-4"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}

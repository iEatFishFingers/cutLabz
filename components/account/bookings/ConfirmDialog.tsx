"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { BTN_PRIMARY, BTN_SECONDARY } from "./ui";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Modal confirm step: focus trap, Escape to close, focus returns to the opener. */
export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      // Skip if the opener left the page (e.g. the card was removed).
      if (openerRef.current?.isConnected) openerRef.current.focus();
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      if (!pending) onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    const inside = dialogRef.current?.contains(active) ?? false;
    if (e.shiftKey && (active === first || !inside)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !inside)) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => !pending && onClose()}
        className="absolute inset-0 bg-black/70 cursor-default"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="relative w-full max-w-md bg-[#0b0b0b] border border-white/10 p-6"
      >
        <h2 id={titleId} className="text-lg font-[500] tracking-[-0.01em]">
          {title}
        </h2>
        <div className="mt-3 text-sm text-white/60 space-y-2">{children}</div>
        <p aria-live="assertive" className="mt-3 text-sm text-red-400 empty:hidden">
          {error}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            disabled={pending}
            className={BTN_SECONDARY}
          >
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={pending} className={BTN_PRIMARY}>
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Portal-based modal. Rendering into document.body matters: GlassCard's
 * backdrop-filter creates a CSS containing block, so a `fixed inset-0`
 * overlay rendered inside one (e.g. a button inside an EmptyState card) gets
 * trapped in that card instead of covering the screen. The portal makes the
 * overlay's position independent of wherever the trigger button lives.
 */
export function Modal({
  onClose,
  ariaLabel,
  children,
  maxWidth = "max-w-lg",
}: {
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
        className={cn(
          "max-h-[88vh] w-full overflow-y-auto rounded-2xl bg-white/95 p-6 shadow-soft ring-1 ring-ink/[0.06] backdrop-blur-xl",
          maxWidth,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/** Standard modal header: title, optional subtitle, close button. */
export function ModalHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-ink/5"
        aria-label="Close"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * In-house replacement for window.confirm: same glass language as the rest
 * of the dashboard. onConfirm may be async (usually a server action); the
 * dialog shows its own pending state and closes when it resolves.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Delete",
  tone = "danger",
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => Promise<unknown> | void;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();

  return (
    <Modal onClose={onClose} ariaLabel={title} maxWidth="max-w-sm">
      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            "inline-flex shrink-0 rounded-xl p-2.5",
            tone === "danger" ? "bg-rose-500/10" : "bg-violet/10",
          )}
        >
          <TriangleAlert
            className={cn("h-4 w-4", tone === "danger" ? "text-rose-600" : "text-violet")}
            aria-hidden="true"
          />
        </span>
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{body}</p>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-ink/5 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await onConfirm();
              onClose();
            })
          }
          className={cn(
            "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100",
            tone === "danger" ? "bg-rose-600 hover:bg-rose-700" : "bg-violet hover:bg-violet-deep",
          )}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

"use client";

import { useEffect, useId } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface AppModalProps {
  open: boolean;
  title: string;
  description?: string;
  maxWidthClassName?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function AppModal({
  open,
  title,
  description,
  maxWidthClassName = "max-w-3xl",
  onClose,
  children,
}: AppModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeydown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center px-0 py-0 sm:items-center sm:px-4 sm:py-6">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex max-h-[95vh] w-full flex-col overflow-hidden rounded-t-lg border border-[var(--border)] bg-[var(--card)] shadow-[0_20px_50px_-12px_rgba(15,23,42,0.45)] sm:max-h-[92vh] sm:rounded-lg",
          maxWidthClassName,
        )}
      >
        <div className="h-1.5 bg-[var(--primary)]/85" />
        <header className="flex items-start justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div>
            <h3 id={titleId} className="text-lg font-semibold text-[var(--foreground)]">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted-foreground)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            aria-label="Tutup popup"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

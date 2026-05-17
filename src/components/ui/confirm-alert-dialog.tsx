"use client";

import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmAlertDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "danger" | "primary";
  isPending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmAlertDialog({
  open,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  confirmTone = "danger",
  isPending = false,
  onClose,
  onConfirm,
}: ConfirmAlertDialogProps) {
  const confirmVariant = confirmTone === "primary" ? "default" : "destructive";
  const confirmClassName =
    confirmTone === "primary"
      ? "border-[var(--secondary)] bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90"
      : "border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPending) {
          onClose();
        }
      }}
    >
      <AlertDialogContent size="sm" className="max-w-lg border border-[var(--border)] bg-[var(--card)]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[var(--foreground)]">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[var(--muted-foreground)]">{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="border-[var(--border)] bg-[var(--muted)]/50">
          <AlertDialogCancel onClick={onClose} disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isPending}
            className={confirmClassName}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>{confirmLabel}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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
  isPending = false,
  onClose,
  onConfirm,
}: ConfirmAlertDialogProps) {
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
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="border-[var(--danger-soft-border)] bg-[var(--danger-soft-bg)] text-[var(--danger-soft-foreground)] hover:opacity-90"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>{confirmLabel}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

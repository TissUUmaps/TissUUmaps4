import type { ReactNode } from "react";

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

export interface ConfirmDialogProps {
  title: string;
  body?: ReactNode;
  cancelButton?: ReactNode;
  actionButton?: ReactNode;
  /** Whether the dialog is shown. */
  open: boolean;
  /**
   * Rejects the prompt (cancel button, escape, or backdrop). Resolves to
   * `false`.
   */
  onCancel: () => void;
  /** Accepts the prompt. Resolves to `true`. */
  onConfirm: () => void;
}

/**
 * Yes/no dialog. Resolves to `true` when confirmed and `false` when
 * cancelled or dismissed.
 */
export function ConfirmDialog({
  title,
  body,
  cancelButton,
  actionButton,
  open,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {body ? (
            <AlertDialogDescription>{body}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelButton ?? "No"}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {actionButton ?? "Yes"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

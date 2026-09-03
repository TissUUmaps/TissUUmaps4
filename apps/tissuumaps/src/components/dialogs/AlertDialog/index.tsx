import type { ReactNode } from "react";

import {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialog as AlertDialogRoot,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// The caller-facing fields: everything except the open state and the
// callbacks, which are owned by the DialogProvider.
export type AlertDialogParams = Omit<AlertDialogProps, "open" | "onDismiss">;

export interface AlertDialogProps {
  title: string;
  body?: ReactNode;
  actionButton?: ReactNode;
  /** Whether the dialog is shown. */
  open: boolean;
  /**
   * Dismisses the dialog (action button, escape, or backdrop). An alert
   * resolves to `true`.
   */
  onDismiss: () => void;
}

/**
 * Acknowledgement dialog with a single button. Resolves to `true` once
 * dismissed.
 */
export function AlertDialog({
  title,
  body,
  actionButton,
  open,
  onDismiss,
}: AlertDialogProps) {
  return (
    <AlertDialogRoot
      open={open}
      onOpenChange={(open) => {
        if (!open) onDismiss();
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
          <AlertDialogAction onClick={onDismiss}>
            {actionButton ?? "Okay"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialogRoot>
  );
}

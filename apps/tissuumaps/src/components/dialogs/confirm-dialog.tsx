import {
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmParams {
  title: string;
  body?: string;
  cancelButton?: string;
  actionButton?: string;
}

interface ConfirmContentProps extends ConfirmParams {
  /** Rejects the prompt. Resolves to `false`. */
  onCancel: () => void;
  /** Accepts the prompt. Resolves to `true`. */
  onConfirm: () => void;
}

/**
 * Yes/no dialog. Resolves to `true` when confirmed and `false` when
 * cancelled or dismissed.
 */
export function ConfirmContent({
  title,
  body,
  cancelButton,
  actionButton,
  onCancel,
  onConfirm,
}: ConfirmContentProps) {
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {body ? <AlertDialogDescription>{body}</AlertDialogDescription> : null}
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {cancelButton ?? "Cancel"}
        </Button>
        <Button type="button" onClick={onConfirm}>
          {actionButton ?? "Okay"}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

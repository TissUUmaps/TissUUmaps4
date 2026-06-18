import {
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export interface AlertParams {
  title: string;
  body?: string;
  cancelButton?: string;
}

interface AlertContentProps extends AlertParams {
  /** Dismisses the dialog. An alert resolves to `true`. */
  onCancel: () => void;
}

/**
 * Acknowledgement dialog with a single button. Resolves to `true` once
 * dismissed.
 */
export function AlertContent({
  title,
  body,
  cancelButton,
  onCancel,
}: AlertContentProps) {
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {body ? <AlertDialogDescription>{body}</AlertDialogDescription> : null}
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {cancelButton ?? "Okay"}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

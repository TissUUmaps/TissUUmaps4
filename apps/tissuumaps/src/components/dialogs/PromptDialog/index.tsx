import { type ComponentProps, type ReactNode, useRef } from "react";

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
import { Input } from "@/components/ui/input";

// The caller-facing fields: everything except the open state and the
// callbacks, which are owned by the DialogProvider.
export type PromptDialogParams = Omit<
  PromptDialogProps,
  "open" | "onCancel" | "onConfirm"
>;

export interface PromptDialogProps {
  title: string;
  body?: ReactNode;
  cancelButton?: ReactNode;
  actionButton?: ReactNode;
  defaultValue?: string;
  /** Extra props for the input, except those owned by the dialog itself. */
  inputProps?: Omit<
    ComponentProps<"input">,
    "ref" | "name" | "defaultValue" | "value" | "onChange"
  >;
  /** Whether the dialog is shown. */
  open: boolean;
  /**
   * Dismisses the prompt without a value (cancel button, escape, or
   * backdrop). Resolves to `null`.
   */
  onCancel: () => void;
  /** Submits the prompt. Resolves to the input's value. */
  onConfirm: (value: string) => void;
}

/**
 * Text-input dialog. Resolves to the entered string on submit, or `null`
 * when cancelled or dismissed.
 */
export function PromptDialog({
  title,
  body,
  cancelButton,
  actionButton,
  defaultValue,
  inputProps,
  open,
  onCancel,
  onConfirm,
}: PromptDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <form
          className="grid gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            onConfirm(inputRef.current?.value ?? "");
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {body ? (
              <AlertDialogDescription>{body}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <Input
            {...inputProps}
            ref={inputRef}
            name="prompt"
            defaultValue={defaultValue}
          />
          <AlertDialogFooter>
            <AlertDialogCancel type="button">
              {cancelButton ?? "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction type="submit">
              {actionButton ?? "Okay"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import {
  type DetailedHTMLProps,
  type InputHTMLAttributes,
  type PropsWithoutRef,
  useRef,
} from "react";

import {
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface PromptParams {
  title: string;
  body?: string;
  cancelButton?: string;
  actionButton?: string;
  defaultValue?: string;
  inputProps?: PropsWithoutRef<
    DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
  >;
}

interface PromptContentProps extends PromptParams {
  /** Dismisses the prompt without a value. Resolves to `null`. */
  onCancel: () => void;
  /** Submits the prompt. Resolves to the input's value. */
  onConfirm: (value: string) => void;
}

/**
 * Text-input dialog. Resolves to the entered string on submit, or `null`
 * when cancelled or dismissed.
 */
export function PromptContent({
  title,
  body,
  cancelButton,
  actionButton,
  defaultValue,
  inputProps,
  onCancel,
  onConfirm,
}: PromptContentProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm(inputRef.current?.value ?? "");
      }}
    >
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {body ? <AlertDialogDescription>{body}</AlertDialogDescription> : null}
      </AlertDialogHeader>
      <Input
        {...inputProps}
        ref={inputRef}
        name="prompt"
        defaultValue={defaultValue}
      />
      <AlertDialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {cancelButton ?? "Cancel"}
        </Button>
        <Button type="submit">{actionButton ?? "Okay"}</Button>
      </AlertDialogFooter>
    </form>
  );
}

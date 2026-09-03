import { createContext, useContext } from "react";

import type { AlertDialogProps } from "./AlertDialog";
import type { ConfirmDialogProps } from "./ConfirmDialog";
import type { PromptDialogProps } from "./PromptDialog";

// The caller-facing fields of each dialog: everything except the open state
// and the callbacks, which are owned by the DialogProvider.
export type AlertParams = Omit<AlertDialogProps, "open" | "onDismiss">;
export type ConfirmParams = Omit<
  ConfirmDialogProps,
  "open" | "onCancel" | "onConfirm"
>;
export type PromptParams = Omit<
  PromptDialogProps,
  "open" | "onCancel" | "onConfirm"
>;

export type DialogAction =
  | ({ type: "alert" } & AlertParams)
  | ({ type: "confirm" } & ConfirmParams)
  | ({ type: "prompt" } & PromptParams);

export type DialogType = DialogAction["type"];

export type Params<T extends DialogType> =
  Omit<Extract<DialogAction, { type: T }>, "type"> | string;

/**
 * Imperatively opens a dialog and resolves with its result: `boolean` for
 * `alert`/`confirm`, and `string | null` for `prompt`.
 */
export type DialogContextType = <T extends DialogAction>(
  params: T,
) => Promise<T["type"] extends "alert" | "confirm" ? boolean : null | string>;

export const DialogContext = createContext<DialogContextType | null>(null);

export function useDialogContext() {
  const context = useContext(DialogContext);
  if (context === null) {
    throw new Error("useDialogContext must be used within DialogProvider");
  }
  return context;
}

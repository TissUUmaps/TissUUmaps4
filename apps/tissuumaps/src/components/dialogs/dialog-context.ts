import { createContext, useCallback, useContext } from "react";

import type { AlertParams } from "./alert-dialog";
import type { ConfirmParams } from "./confirm-dialog";
import type { PromptParams } from "./prompt-dialog";

export type DialogAction =
  | ({ type: "alert" } & AlertParams)
  | ({ type: "confirm" } & ConfirmParams)
  | ({ type: "prompt" } & PromptParams);

export type DialogType = DialogAction["type"];

/**
 * Imperatively opens a dialog and resolves with its result: `boolean` for
 * `alert`/`confirm`, and `string | null` for `prompt`.
 */
export type DialogContextType = <T extends DialogAction>(
  params: T,
) => Promise<T["type"] extends "alert" | "confirm" ? boolean : null | string>;

export const DialogContext = createContext<DialogContextType | null>(null);

function useDialogContext() {
  const context = useContext(DialogContext);
  if (context === null) {
    throw new Error("useDialogContext must be used within DialogProvider");
  }
  return context;
}

type Params<T extends DialogType> =
  | Omit<Extract<DialogAction, { type: T }>, "type">
  | string;

/** Opens an acknowledgement dialog. Resolves to `true` once dismissed. */
export function useAlert() {
  const dialog = useDialogContext();

  return useCallback(
    (params: Params<"alert">) =>
      dialog({
        ...(typeof params === "string" ? { title: params } : params),
        type: "alert",
      }),
    [dialog],
  );
}

/** Opens a yes/no dialog. Resolves to `true` when confirmed, `false` otherwise. */
export function useConfirm() {
  const dialog = useDialogContext();

  return useCallback(
    (params: Params<"confirm">) =>
      dialog({
        ...(typeof params === "string" ? { title: params } : params),
        type: "confirm",
      }),
    [dialog],
  );
}

/** Opens a text-input dialog. Resolves to the entered string, or `null`. */
export function usePrompt() {
  const dialog = useDialogContext();

  return useCallback(
    (params: Params<"prompt">) =>
      dialog({
        ...(typeof params === "string" ? { title: params } : params),
        type: "prompt",
      }),
    [dialog],
  );
}

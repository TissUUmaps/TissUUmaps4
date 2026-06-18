import { type ReactNode, useCallback, useReducer, useRef } from "react";

import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";

import { AlertContent, type AlertParams } from "./alert-dialog";
import { ConfirmContent, type ConfirmParams } from "./confirm-dialog";
import {
  type DialogAction,
  DialogContext,
  type DialogContextType,
  type DialogType,
} from "./dialog-context";
import { PromptContent, type PromptParams } from "./prompt-dialog";

type DialogState = { open: boolean; type: DialogType } & Partial<
  AlertParams & ConfirmParams & PromptParams
>;

type ReducerAction = DialogAction | { type: "close" };

function dialogReducer(state: DialogState, action: ReducerAction): DialogState {
  if (action.type === "close") {
    return { ...state, open: false };
  }
  // Reset per-dialog fields so values don't leak between dialog types.
  return {
    open: true,
    body: undefined,
    cancelButton: undefined,
    actionButton: undefined,
    defaultValue: undefined,
    inputProps: undefined,
    ...action,
  };
}

/**
 * Orchestrates the imperative dialog API: it owns the open state and the
 * pending promise, and renders the matching dialog for the active type. The
 * presentation and per-type behavior live in the `*-dialog` components.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dialogReducer, {
    open: false,
    type: "alert",
    title: "",
  });

  const resolveRef =
    useRef<
      (
        value: boolean | string | null | PromiseLike<boolean | string | null>,
      ) => void
    >(null);

  const typeRef = useRef<DialogType>("alert");

  // `resolveByType`, `close`, and `confirm` read only refs and the stable
  // `dispatch`, so the `dialog` callback below can capture them once (deps
  // `[]`) without going stale.
  // Resolves the pending promise with the dismissal value for the active type.
  function resolveByType() {
    const type = typeRef.current;
    if (type === "alert") {
      resolveRef.current?.(true);
    } else if (type === "prompt") {
      resolveRef.current?.(null);
    } else {
      resolveRef.current?.(false);
    }
    resolveRef.current = null;
  }

  function close() {
    dispatch({ type: "close" });
    resolveByType();
  }

  function confirm(value?: string) {
    dispatch({ type: "close" });
    resolveRef.current?.(value ?? true);
    resolveRef.current = null;
  }

  const dialog: DialogContextType = useCallback(
    <T extends DialogAction>(params: T) => {
      // Resolve any dialog still open before replacing it.
      resolveByType();
      typeRef.current = params.type;
      dispatch(params);

      return new Promise<
        T["type"] extends "alert" | "confirm" ? boolean : null | string
      >((resolve) => {
        resolveRef.current = resolve as (
          value: boolean | string | null | PromiseLike<boolean | string | null>,
        ) => void;
      });
    },
    [],
  );

  return (
    <DialogContext.Provider value={dialog}>
      {children}
      <AlertDialog
        open={state.open}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <AlertDialogContent>
          {state.type === "alert" && (
            <AlertContent
              title={state.title ?? ""}
              body={state.body}
              cancelButton={state.cancelButton}
              onDismiss={close}
            />
          )}
          {state.type === "confirm" && (
            <ConfirmContent
              title={state.title ?? ""}
              body={state.body}
              cancelButton={state.cancelButton}
              actionButton={state.actionButton}
              onCancel={close}
              onConfirm={() => confirm()}
            />
          )}
          {state.type === "prompt" && (
            <PromptContent
              title={state.title ?? ""}
              body={state.body}
              cancelButton={state.cancelButton}
              actionButton={state.actionButton}
              defaultValue={state.defaultValue}
              inputProps={state.inputProps}
              onCancel={close}
              onConfirm={confirm}
            />
          )}
        </AlertDialogContent>
      </AlertDialog>
    </DialogContext.Provider>
  );
}

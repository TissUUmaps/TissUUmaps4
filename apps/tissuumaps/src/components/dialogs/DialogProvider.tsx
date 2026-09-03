import {
  type Dispatch,
  Fragment,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
  useState,
} from "react";

import { AlertDialog, type AlertDialogParams } from "./AlertDialog";
import { ConfirmDialog, type ConfirmDialogParams } from "./ConfirmDialog";
import { DialogContext, type DialogContextValue } from "./DialogContext";
import { PromptDialog, type PromptDialogParams } from "./PromptDialog";

type DialogProviderProps = {
  children: ReactNode;
};

type ActiveDialog = {
  id: number;
  render: (open: boolean) => ReactElement;
};

/**
 * Builds the imperative dialog API on top of the provider's state setters.
 * Called once per provider: the setters are stable, so the value never needs
 * to change.
 */
function createDialogContextValue(
  setDialog: Dispatch<SetStateAction<ActiveDialog | null>>,
  setOpen: Dispatch<SetStateAction<boolean>>,
): DialogContextValue {
  // Settles the dialog still pending (if any) with its dismissal value.
  let dismiss: (() => void) | null = null;

  function show<T>(
    dismissValue: T,
    render: (settle: (value: T) => void) => (open: boolean) => ReactElement,
  ) {
    dismiss?.();
    return new Promise<T>((resolve) => {
      const settle = (value: T) => {
        dismiss = null;
        setOpen(false);
        resolve(value);
      };
      dismiss = () => settle(dismissValue);
      // A new id on every open so uncontrolled content (e.g. the prompt
      // input) remounts rather than retaining the previous dialog's value.
      setDialog((previous) => ({
        id: (previous?.id ?? 0) + 1,
        render: render(settle),
      }));
      setOpen(true);
    });
  }

  return {
    alert: (params: AlertDialogParams) =>
      show<void>(undefined, (settle) => (open) => (
        <AlertDialog {...params} open={open} onDismiss={() => settle()} />
      )),
    confirm: (params: ConfirmDialogParams) =>
      show(false, (settle) => (open) => (
        <ConfirmDialog
          {...params}
          open={open}
          onCancel={() => settle(false)}
          onConfirm={() => settle(true)}
        />
      )),
    prompt: (params: PromptDialogParams) =>
      show<string | null>(null, (settle) => (open) => (
        <PromptDialog
          {...params}
          open={open}
          onCancel={() => settle(null)}
          onConfirm={settle}
        />
      )),
  };
}

/**
 * Orchestrates the imperative dialog API: it owns the open state and the
 * pending promise, and renders the currently active dialog. Because dialogs
 * open imperatively, `AlertDialogTrigger` is never used.
 */
export function DialogProvider({ children }: DialogProviderProps) {
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const [open, setOpen] = useState(false);
  const [value] = useState(() => createDialogContextValue(setDialog, setOpen));

  return (
    <DialogContext.Provider value={value}>
      {children}
      {/* The dialog stays mounted with `open=false` so the close animation plays. */}
      {dialog && <Fragment key={dialog.id}>{dialog.render(open)}</Fragment>}
    </DialogContext.Provider>
  );
}

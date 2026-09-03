import {
  type ReactElement,
  type ReactNode,
  cloneElement,
  useRef,
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
  element: ReactElement<{ open: boolean }>;
};

/**
 * Orchestrates the imperative dialog API: it owns the open state and the
 * pending promise, and renders the currently active dialog element. Because
 * dialogs open imperatively, `AlertDialogTrigger` is never used.
 */
export function DialogProvider({ children }: DialogProviderProps) {
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const [open, setOpen] = useState(false);

  // Settles the dialog still pending (if any) with its dismissal value.
  const dismissRef = useRef<(() => void) | null>(null);

  // Memoization is left to the React Compiler: the manual `useCallback` /
  // `useMemo` pair cannot be preserved around the generic `show`.
  function show<T>(
    dismissValue: T,
    render: (settle: (value: T) => void) => ReactElement<{ open: boolean }>,
  ) {
    dismissRef.current?.();
    return new Promise<T>((resolve) => {
      const settle = (value: T) => {
        dismissRef.current = null;
        setOpen(false);
        resolve(value);
      };
      dismissRef.current = () => settle(dismissValue);
      // A new id on every open so uncontrolled content (e.g. the prompt
      // input) remounts rather than retaining the previous dialog's value.
      setDialog((previous) => ({
        id: (previous?.id ?? 0) + 1,
        element: render(settle),
      }));
      setOpen(true);
    });
  }

  const value: DialogContextValue = {
    alert: (params: AlertDialogParams) =>
      show<void>(undefined, (settle) => (
        <AlertDialog {...params} open onDismiss={() => settle()} />
      )),
    confirm: (params: ConfirmDialogParams) =>
      show(false, (settle) => (
        <ConfirmDialog
          {...params}
          open
          onCancel={() => settle(false)}
          onConfirm={() => settle(true)}
        />
      )),
    prompt: (params: PromptDialogParams) =>
      show<string | null>(null, (settle) => (
        <PromptDialog
          {...params}
          open
          onCancel={() => settle(null)}
          onConfirm={settle}
        />
      )),
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
      {/* The element stays mounted with `open=false` so the close animation plays. */}
      {dialog && cloneElement(dialog.element, { key: dialog.id, open })}
    </DialogContext.Provider>
  );
}

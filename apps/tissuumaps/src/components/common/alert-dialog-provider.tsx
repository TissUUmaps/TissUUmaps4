import * as React from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AlertDialogAction =
  | { type: "alert"; title: string; body?: string; cancelButton?: string }
  | {
      type: "confirm";
      title: string;
      body?: string;
      cancelButton?: string;
      actionButton?: string;
    }
  | {
      type: "prompt";
      title: string;
      body?: string;
      cancelButton?: string;
      actionButton?: string;
      defaultValue?: string;
      inputProps?: React.DetailedHTMLProps<
        React.InputHTMLAttributes<HTMLInputElement>,
        HTMLInputElement
      >;
    };

type AlertAction = AlertDialogAction | { type: "close" };

type AlertDialogContextType = <T extends AlertDialogAction>(
  params: T,
) => Promise<T["type"] extends "alert" | "confirm" ? boolean : null | string>;

const AlertDialogContext = React.createContext<AlertDialogContextType | null>(
  null,
);

interface AlertDialogState {
  open: boolean;
  title: string;
  body: string;
  type: "alert" | "confirm" | "prompt";
  cancelButton: string;
  actionButton: string;
  defaultValue?: string;
  inputProps?: React.PropsWithoutRef<
    React.DetailedHTMLProps<
      React.InputHTMLAttributes<HTMLInputElement>,
      HTMLInputElement
    >
  >;
}

// eslint-disable-next-line react-refresh/only-export-components
export function alertDialogReducer(
  state: AlertDialogState,
  action: AlertAction,
): AlertDialogState {
  switch (action.type) {
    case "close":
      return { ...state, open: false };
    case "alert":
    case "confirm":
    case "prompt":
      return {
        ...state,
        open: true,
        body: "",
        defaultValue: undefined,
        inputProps: undefined,
        ...action,
        cancelButton:
          action.cancelButton || (action.type === "alert" ? "Okay" : "Cancel"),
        actionButton:
          ("actionButton" in action && action.actionButton) || "Okay",
      };
    default:
      return state;
  }
}

export function AlertDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = React.useReducer(alertDialogReducer, {
    open: false,
    title: "",
    body: "",
    type: "alert",
    cancelButton: "Cancel",
    actionButton: "Okay",
  });

  const resolveRef =
    React.useRef<
      (
        tf: boolean | string | null | PromiseLike<boolean | string | null>,
      ) => void
    >(null);

  const typeRef = React.useRef<"alert" | "confirm" | "prompt">("alert");

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

  const dialog: AlertDialogContextType = React.useCallback(
    async <T extends AlertDialogAction>(params: T) => {
      resolveByType();
      typeRef.current = params.type;
      dispatch(params);

      return new Promise<
        T["type"] extends "alert" | "confirm" ? boolean : null | string
      >((resolve) => {
        resolveRef.current = resolve as (
          tf: boolean | string | null | PromiseLike<boolean | string | null>,
        ) => void;
      });
    },
    [],
  );

  return (
    <AlertDialogContext.Provider value={dialog}>
      {children}
      <AlertDialog
        open={state.open}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <AlertDialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              confirm((event.currentTarget.prompt as HTMLInputElement)?.value);
            }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{state.title}</AlertDialogTitle>
              {state.body ? (
                <AlertDialogDescription>{state.body}</AlertDialogDescription>
              ) : null}
            </AlertDialogHeader>
            {state.type === "prompt" && (
              <Input
                name="prompt"
                defaultValue={state.defaultValue}
                {...state.inputProps}
              />
            )}
            <AlertDialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                {state.cancelButton}
              </Button>
              {state.type === "alert" ? null : (
                <Button type="submit">{state.actionButton}</Button>
              )}
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </AlertDialogContext.Provider>
  );
}

function useAlertDialogContext() {
  const context = React.useContext(AlertDialogContext);
  if (context === null) {
    throw new Error(
      "useAlertDialogContext must be used within AlertDialogProvider",
    );
  }
  return context;
}

type Params<T extends "alert" | "confirm" | "prompt"> =
  | Omit<Extract<AlertDialogAction, { type: T }>, "type">
  | string;

// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm() {
  const dialog = useAlertDialogContext();

  return React.useCallback(
    (params: Params<"confirm">) => {
      return dialog({
        ...(typeof params === "string" ? { title: params } : params),
        type: "confirm",
      });
    },
    [dialog],
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function usePrompt() {
  const dialog = useAlertDialogContext();

  return React.useCallback(
    (params: Params<"prompt">) =>
      dialog({
        ...(typeof params === "string" ? { title: params } : params),
        type: "prompt",
      }),
    [dialog],
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAlert() {
  const dialog = useAlertDialogContext();

  return React.useCallback(
    (params: Params<"alert">) =>
      dialog({
        ...(typeof params === "string" ? { title: params } : params),
        type: "alert",
      }),
    [dialog],
  );
}

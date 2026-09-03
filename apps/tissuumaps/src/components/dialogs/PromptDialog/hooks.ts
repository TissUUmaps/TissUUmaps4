import { useCallback } from "react";

import { type Params, useDialogContext } from "../DialogContext";

/** Opens a text-input dialog. Resolves to the entered string, or `null`. */
export function usePromptDialog() {
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

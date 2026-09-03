import { useCallback } from "react";

import { type Params, useDialogContext } from "../DialogContext";

/** Opens a yes/no dialog. Resolves to `true` when confirmed, `false` otherwise. */
export function useConfirmDialog() {
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

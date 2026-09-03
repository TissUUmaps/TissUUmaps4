import { useCallback } from "react";

import { type Params, useDialogContext } from "../DialogContext";

/** Opens an acknowledgement dialog. Resolves to `true` once dismissed. */
export function useAlertDialog() {
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

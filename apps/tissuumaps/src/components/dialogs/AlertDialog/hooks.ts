import { useDialogContext } from "../DialogContext";

/** Opens an acknowledgement dialog. Resolves once dismissed. */
export function useAlertDialog() {
  return useDialogContext().alert;
}

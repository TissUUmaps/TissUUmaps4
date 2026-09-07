import { useDialogContext } from "../DialogContext";

/** Returns the `alert` function of the nearest `DialogProvider`. */
export function useAlertDialog() {
  return useDialogContext().alert;
}

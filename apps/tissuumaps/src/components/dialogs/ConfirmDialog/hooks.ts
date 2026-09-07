import { useDialogContext } from "../DialogContext";

/** Returns the `confirm` function of the nearest `DialogProvider`. */
export function useConfirmDialog() {
  return useDialogContext().confirm;
}

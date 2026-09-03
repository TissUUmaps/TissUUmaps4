import { useDialogContext } from "../DialogContext";

/** Opens a yes/no dialog. Resolves to `true` when confirmed, `false` when cancelled or dismissed. */
export function useConfirmDialog() {
  return useDialogContext().confirm;
}

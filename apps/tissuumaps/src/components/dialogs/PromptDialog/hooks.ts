import { useDialogContext } from "../DialogContext";

/** Opens a text-input dialog. Resolves to the entered string, or `null` when cancelled or dismissed. */
export function usePromptDialog() {
  return useDialogContext().prompt;
}

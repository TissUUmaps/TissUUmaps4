import { useDialogContext } from "../DialogContext";

/** Returns the `prompt` function of the nearest `DialogProvider`. */
export function usePromptDialog() {
  return useDialogContext().prompt;
}

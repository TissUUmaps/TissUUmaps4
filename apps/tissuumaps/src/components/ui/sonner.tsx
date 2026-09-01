import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import "sonner/dist/styles.css";

import { useSettingsStore } from "@/stores/settings";

/**
 * Themed sonner Toaster.
 *
 * Toasts are rendered unstyled so callers fully control their content (our
 * load cards). `expand` is left at its default (false) so cards stack on top of
 * one another and fan out on hover, matching the sonner stacked style.
 */
export function Toaster(props: ToasterProps) {
  const dark = useSettingsStore((state) => state.dark);
  return (
    <Sonner
      theme={dark ? "dark" : "light"}
      position="bottom-right"
      toastOptions={{ unstyled: true }}
      // Fixed, slightly wider toast width (cards are sized to match).
      style={{ "--width": "24rem" } as CSSProperties}
      {...props}
    />
  );
}

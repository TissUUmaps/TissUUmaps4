import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useOpenSeadragonContext } from "../../context/OpenSeadragonContextContext";
import type { ViewerControlAnchor } from "./types";

export { ViewerControlAnchor } from "./types";

export type ViewerControlProps = {
  anchor?: ViewerControlAnchor;
  attachToViewer?: boolean;
  autoFade?: boolean;
  children?: ReactNode;
};

export function ViewerControl({
  anchor,
  attachToViewer,
  autoFade,
  children,
}: ViewerControlProps) {
  const [container] = useState(() => document.createElement("div"));

  const context = useOpenSeadragonContext();

  useEffect(() => {
    if (context !== null) {
      context.viewer.addControl(container, {
        anchor,
        attachToViewer,
        autoFade,
      });
    }
    return () => {
      if (context !== null) {
        // @ts-expect-error OpenSeadragon typings are wrong
        context.viewer.removeControl(container);
      }
    };
  }, [context, container, anchor, attachToViewer, autoFade]);

  return createPortal(children, container);
}

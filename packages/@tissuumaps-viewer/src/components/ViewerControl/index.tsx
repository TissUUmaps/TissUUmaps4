import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useOpenSeadragonController } from "../../context/OpenSeadragonControllerContext";
import { type ViewerControlAnchor } from "./types";

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

  const os = useOpenSeadragonController();

  useEffect(() => {
    if (os !== null) {
      os.viewer.addControl(container, { anchor, attachToViewer, autoFade });
    }
    return () => {
      if (os !== null) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore OpenSeadragon typings are wrong
        os.viewer.removeControl(container);
      }
    };
  }, [os, container, anchor, attachToViewer, autoFade]);

  return createPortal(children, container);
}

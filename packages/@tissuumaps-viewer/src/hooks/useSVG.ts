import { useEffect, useReducer, useRef } from "react";

import { type Rect, SVGController } from "@tissuumaps/core";

import { type ViewerAdapter } from "../adapter";

export function useSVG(
  adapter: ViewerAdapter,
  parent: Element | null,
  viewport: Rect | null,
) {
  const { interactionMode, addShape } = adapter;

  const controllerRef = useRef<SVGController | null>(null);
  const [controllerReady, markControllerReady] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    let container: SVGSVGElement | undefined;
    let controller: SVGController | undefined;
    if (parent !== null && viewport !== null) {
      console.debug("Initializing SVG");
      container = parent.appendChild(SVGController.createContainer());
      controller = new SVGController(container, viewport, {
        onShapeComplete: addShape,
      });
      controllerRef.current = controller;
      markControllerReady();
    }
    return () => {
      if (controller !== undefined) {
        controllerRef.current = null;
        controller.destroy();
      }
      if (container !== undefined && parent !== null) {
        parent.removeChild(container);
      }
    };
  }, [parent, viewport, addShape]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (controller !== null) {
      console.debug("Setting interaction mode");
      controller.setInteractionMode(interactionMode);
    }
  }, [controllerReady, interactionMode]);

  return { controllerRef, controllerReady };
}

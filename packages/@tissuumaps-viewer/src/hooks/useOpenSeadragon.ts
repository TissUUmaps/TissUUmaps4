import { useCallback, useEffect, useRef, useState } from "react";

import { OpenSeadragonController, type Rect } from "@tissuumaps/core";

import { useViewer } from "../context";

export function useOpenSeadragon({
  containerResizedHandler,
  viewportChangedHandler,
}: {
  containerResizedHandler?: (newContainerSize: {
    width: number;
    height: number;
  }) => void;
  viewportChangedHandler?: (newViewport: Rect) => void;
} = {}) {
  const controllerRef = useRef<OpenSeadragonController | null>(null);
  const [viewerState, setViewerState] = useState<{
    canvas: Element | null;
    initialViewport: Rect | null;
  }>({ canvas: null, initialViewport: null });

  const {
    projectDir,
    layers,
    images,
    labels,
    viewerOptions,
    viewerAnimationStartOptions,
    viewerAnimationFinishOptions,
    loadImage,
    loadLabels,
  } = useViewer();

  // use a ref callback for initializing the OpenSeadragon viewer
  // (note: ref callbacks are always executed before useEffect hooks)
  // https://react.dev/reference/react-dom/components/common#ref-callback
  const viewerElementRef = useCallback(
    (viewerElement: HTMLDivElement | null) => {
      if (viewerElement !== null) {
        console.debug("Initializing OpenSeadragon");
        const controller = new OpenSeadragonController(
          viewerElement,
          (viewer) => {
            if (containerResizedHandler !== undefined) {
              viewer.addHandler("resize", (event) => {
                containerResizedHandler({
                  width: event.newContainerSize.x,
                  height: event.newContainerSize.y,
                });
              });
            }
            if (viewportChangedHandler !== undefined) {
              viewer.addHandler("viewport-change", () => {
                viewportChangedHandler(viewer.viewport.getBounds(true));
              });
            }
            setViewerState({
              canvas: viewer.canvas,
              initialViewport: viewer.viewport.getBounds(true),
            });
          },
        );
        controllerRef.current = controller;
      }
      // React 19 added cleanup functions for ref callbacks
      return () => {
        const controller = controllerRef.current;
        if (controller !== null) {
          console.debug("Destroying OpenSeadragon");
          controller.destroy();
          controllerRef.current = null;
        }
      };
    },
    [containerResizedHandler, viewportChangedHandler],
  );

  useEffect(() => {
    console.debug("Setting OpenSeadragon viewer options");
    const controller = controllerRef.current;
    if (controller !== null) {
      controller.setViewerOptions(viewerOptions);
    }
  }, [viewerOptions]);

  useEffect(() => {
    console.debug("Configuring OpenSeadragon animation handlers");
    const controller = controllerRef.current;
    if (controller !== null) {
      controller.configureAnimationHandlers(
        viewerAnimationStartOptions,
        viewerAnimationFinishOptions,
      );
    }
  }, [viewerAnimationStartOptions, viewerAnimationFinishOptions]);

  useEffect(() => {
    console.debug("Synchronizing OpenSeadragon viewer");
    const controller = controllerRef.current;
    const abortController = new AbortController();
    if (controller !== null) {
      controller
        .synchronize(layers, images, labels, loadImage, loadLabels, {
          signal: abortController.signal,
        })
        .then(
          () => {
            if (!abortController.signal.aborted) {
              console.debug("OpenSeadragon viewer synchronized");
            }
          },
          (reason) => {
            if (!abortController.signal.aborted) {
              console.error(reason);
            }
          },
        );
    }
    return () => {
      abortController.abort();
    };
  }, [projectDir, layers, images, labels, loadImage, loadLabels]);

  return { viewerElementRef, viewerState };
}

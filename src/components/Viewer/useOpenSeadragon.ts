import { useCallback, useEffect, useRef, useState } from "react";

import { useBoundStore } from "../../store/boundStore";
import { Rect } from "../../types";
import OpenSeadragonController from "./controllers/OpenSeadragonController";

export default function useOpenSeadragon(options: {
  containerResizedHandler?: (newContainerSize: {
    width: number;
    height: number;
  }) => void;
  viewportChangedHandler?: (newViewport: Rect) => void;
}) {
  const { containerResizedHandler, viewportChangedHandler } = options;

  const controllerRef = useRef<OpenSeadragonController | null>(null);
  const [viewerState, setViewerState] = useState<{
    canvas: Element | null;
    initialViewport: Rect | null;
  }>({ canvas: null, initialViewport: null });

  const layerMap = useBoundStore((state) => state.layerMap);
  const imageMap = useBoundStore((state) => state.imageMap);
  const labelsMap = useBoundStore((state) => state.labelsMap);
  const projectDir = useBoundStore((state) => state.projectDir);
  const imageDataLoaderFactories = useBoundStore(
    (state) => state.imageDataLoaderFactories,
  );
  const labelsDataLoaderFactories = useBoundStore(
    (state) => state.labelsDataLoaderFactories,
  );
  const viewerOptions = useBoundStore((state) => state.viewerOptions);
  const viewerAnimationStartOptions = useBoundStore(
    (state) => state.viewerAnimationStartOptions,
  );
  const viewerAnimationFinishOptions = useBoundStore(
    (state) => state.viewerAnimationFinishOptions,
  );
  const loadImage = useBoundStore((state) => state.loadImage);
  const loadLabels = useBoundStore((state) => state.loadLabels);

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
        .synchronize(layerMap, imageMap, labelsMap, loadImage, loadLabels, {
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
  }, [
    layerMap,
    imageMap,
    labelsMap,
    projectDir,
    imageDataLoaderFactories,
    labelsDataLoaderFactories,
    loadImage,
    loadLabels,
  ]);

  return { viewerElementRef, viewerState };
}

import { useCallback, useEffect, useReducer, useRef } from "react";

import { OpenSeadragonController, type Rect } from "@tissuumaps/core";

import type { ViewerAdapter } from "../adapter";

export function useOpenSeadragon(
  adapter: ViewerAdapter,
  fallbackBounds: () => Rect | null,
) {
  const {
    workspace,
    layers,
    images,
    labels,
    viewerOptions,
    viewerAnimationStartOptions,
    viewerAnimationFinishOptions,
    getImage,
    getLabels,
  } = adapter;

  const controllerRef = useRef<OpenSeadragonController | null>(null);
  const [controllerReady, markControllerReady] = useReducer((x) => x + 1, 0);

  // use a ref callback for initializing the OpenSeadragon viewer
  // (note: ref callbacks are always executed before useEffect hooks)
  // https://react.dev/reference/react-dom/components/common#ref-callback
  const setViewerElementRef = useCallback(
    (viewerElement: HTMLDivElement | null) => {
      let controller: OpenSeadragonController | undefined;
      if (viewerElement !== null) {
        console.debug("Initializing OpenSeadragon");
        controller = new OpenSeadragonController(viewerElement);
        controllerRef.current = controller;
        markControllerReady();
      }
      // React 19 added cleanup functions for ref callbacks
      return () => {
        if (controller !== undefined) {
          controllerRef.current = null;
          controller.destroy();
        }
      };
    },
    [],
  );

  useEffect(() => {
    const controller = controllerRef.current;
    if (controller !== null) {
      console.debug("Setting OpenSeadragon viewer options");
      controller.setViewerOptions(viewerOptions);
    }
  }, [viewerOptions]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (controller !== null) {
      console.debug("Configuring OpenSeadragon animation handlers");
      controller.configureAnimationHandlers(
        viewerAnimationStartOptions,
        viewerAnimationFinishOptions,
      );
    }
  }, [viewerAnimationStartOptions, viewerAnimationFinishOptions]);

  useEffect(() => {
    const controller = controllerRef.current;
    const abortController = new AbortController();
    if (controller !== null) {
      console.debug("Synchronizing OpenSeadragon viewer");
      controller
        .synchronize(layers, images, labels, getImage, getLabels, {
          signal: abortController.signal,
          dummyBounds: fallbackBounds(),
        })
        .catch((error) => {
          if (!abortController.signal.aborted) {
            console.error("Error synchronizing OpenSeadragon viewer", error);
          }
        });
    }
    return () => {
      abortController.abort();
    };
  }, [workspace, layers, images, labels, getImage, getLabels, fallbackBounds]);

  return { setViewerElementRef, controllerRef, controllerReady };
}

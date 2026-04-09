import { useCallback, useEffect, useRef } from "react";

import { OpenSeadragonController } from "@tissuumaps/core";

import { type ViewerAdapter } from "../adapter";

export function useOpenSeadragon(adapter: ViewerAdapter) {
  const {
    interactionMode,
    workspace,
    layers,
    images,
    labels,
    viewerOptions,
    viewerAnimationStartOptions,
    viewerAnimationFinishOptions,
    loadImage,
    loadLabels,
  } = adapter;

  const controllerRef = useRef<OpenSeadragonController | null>(null);

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
        .synchronize(layers, images, labels, loadImage, loadLabels, {
          signal: abortController.signal,
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
  }, [workspace, layers, images, labels, loadImage, loadLabels]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (controller !== null) {
      const enableDragToPan = interactionMode === "pan";
      console.debug(
        `Setting OpenSeadragon drag-to-pan enabled: ${enableDragToPan}`,
      );
      controller.setDragToPanEnabled(enableDragToPan);
    }
  }, [interactionMode]);

  return { setViewerElementRef, controllerRef };
}

import { useEffect, useReducer, useRef } from "react";

import { type Rect, WebGLController } from "@tissuumaps/core";

import { type ViewerAdapter } from "../adapter";

export function useWebGL(
  adapter: ViewerAdapter,
  parent: Element | null,
  initialViewport: Rect | null,
) {
  const {
    workspace,
    layers,
    points,
    shapes,
    markerMaps,
    sizeMaps,
    colorMaps,
    visibilityMaps,
    opacityMaps,
    renderOptions,
    getPoints,
    getShapes,
    getTable,
  } = adapter;

  const controllerRef = useRef<WebGLController | null>(null);
  const [controllerReady, markControllerReady] = useReducer((x) => x + 1, 0);
  const [syncPoints, dispatchSyncPoints] = useReducer((pass) => pass + 1, 0);
  const [syncShapes, dispatchSyncShapes] = useReducer((pass) => pass + 1, 0);

  useEffect(() => {
    let canvas: HTMLCanvasElement | undefined;
    let controller: WebGLController | undefined;
    const abortController = new AbortController();
    if (parent !== null && initialViewport !== null) {
      console.debug("Initializing WebGL");
      canvas = parent.appendChild(WebGLController.createCanvas());
      controller = new WebGLController(canvas, initialViewport);
      controller.initialize({ signal: abortController.signal }).then(
        (controller) => {
          if (!abortController.signal.aborted) {
            controllerRef.current = controller;
            markControllerReady();
            controller.draw();
          }
        },
        (error) => {
          if (!abortController.signal.aborted) {
            console.error("Error initializing WebGL", error);
          }
        },
      );
    }
    return () => {
      abortController?.abort();
      if (controller !== undefined) {
        controllerRef.current = null;
        controller.destroy();
      }
      if (canvas !== undefined && parent !== null) {
        parent.removeChild(canvas);
      }
    };
  }, [parent, initialViewport]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (controllerReady && controller !== null) {
      console.debug("Setting WebGL render options");
      const { syncPoints, syncShapes, redraw } =
        controller.setRenderOptions(renderOptions);
      if (syncPoints) {
        dispatchSyncPoints();
      }
      if (syncShapes) {
        dispatchSyncShapes();
      }
      if (redraw) {
        controller.draw();
      }
    }
  }, [controllerReady, renderOptions]);

  useEffect(() => {
    const controller = controllerRef.current;
    const abortController = new AbortController();
    if (controllerReady && controller !== null) {
      console.debug("Synchronizing WebGL points");
      controller
        .synchronizePoints(
          layers,
          points,
          markerMaps,
          sizeMaps,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          getPoints,
          getTable,
          { signal: abortController.signal },
        )
        .then(
          () => {
            if (!abortController.signal.aborted) {
              controller.draw();
            }
          },
          (error) => {
            if (!abortController.signal.aborted) {
              console.error("Error synchronizing WebGL points", error);
            }
          },
        );
    }
    return () => {
      abortController.abort();
    };
  }, [
    controllerReady,
    syncPoints,
    layers,
    points,
    markerMaps,
    sizeMaps,
    colorMaps,
    visibilityMaps,
    opacityMaps,
    workspace,
    getPoints,
    getTable,
  ]);

  useEffect(() => {
    const controller = controllerRef.current;
    const abortController = new AbortController();
    if (controllerReady && controller !== null) {
      console.debug("Synchronizing WebGL shapes");
      controller
        .synchronizeShapes(
          layers,
          shapes,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          getShapes,
          getTable,
          { signal: abortController.signal },
        )
        .then(
          () => {
            if (!abortController.signal.aborted) {
              controller.draw();
            }
          },
          (error) => {
            if (!abortController.signal.aborted) {
              console.error("Error synchronizing WebGL shapes", error);
            }
          },
        );
    }
    return () => {
      abortController.abort();
    };
  }, [
    controllerReady,
    syncShapes,
    layers,
    shapes,
    colorMaps,
    visibilityMaps,
    opacityMaps,
    workspace,
    getShapes,
    getTable,
  ]);

  return { controllerRef, controllerReady };
}

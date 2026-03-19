import { useCallback, useEffect, useReducer, useRef } from "react";

import { type Rect, WebGLController } from "@tissuumaps/core";

import { useViewer } from "../context";

export function useWebGL(parent: Element | null, initialViewport: Rect | null) {
  const controllerRef = useRef<WebGLController | null>(null);
  const [controllerVersion, incrementControllerVersion] = useReducer(
    (version) => version + 1,
    0,
  );
  const [syncPoints, dispatchSyncPoints] = useReducer((pass) => pass + 1, 0);
  const [syncShapes, dispatchSyncShapes] = useReducer((pass) => pass + 1, 0);

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
    drawOptions,
    loadPoints,
    loadShapes,
    loadTable,
  } = useViewer();

  useEffect(() => {
    let appendedCanvas: HTMLCanvasElement | null = null;
    const abortController = new AbortController();
    if (parent !== null && initialViewport !== null) {
      console.debug("Initializing WebGL");
      const canvas = WebGLController.createCanvas();
      appendedCanvas = parent.appendChild(canvas);
      const controller = new WebGLController(canvas, initialViewport);
      controllerRef.current = controller;
      incrementControllerVersion();
      controller.initialize({ signal: abortController.signal }).then(
        (controller) => {
          if (!abortController.signal.aborted) {
            console.debug("WebGL initialized");
            controller.draw();
          }
        },
        (reason) => {
          if (!abortController.signal.aborted) {
            console.error("Failed to initialize WebGL:", reason);
          }
          controller.destroy();
          controllerRef.current = null;
          parent.removeChild(canvas);
          appendedCanvas = null;
        },
      );
    }
    return () => {
      abortController.abort();
      const controller = controllerRef.current;
      if (controller !== null) {
        console.debug("Destroying WebGL");
        controller.destroy();
        controllerRef.current = null;
      }
      if (parent !== null && appendedCanvas !== null) {
        parent.removeChild(appendedCanvas);
        appendedCanvas = null;
      }
    };
  }, [parent, initialViewport]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (controllerVersion && controller !== null) {
      console.debug("Setting draw options");
      const { syncPoints, syncShapes, redraw } =
        controller.setDrawOptions(drawOptions);
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
  }, [controllerVersion, drawOptions]);

  useEffect(() => {
    const abortController = new AbortController();
    const controller = controllerRef.current;
    if (controllerVersion && controller !== null) {
      console.debug("Synchronizing points");
      controller
        .synchronizePoints(
          layers,
          points,
          markerMaps,
          sizeMaps,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadPoints,
          loadTable,
          { signal: abortController.signal },
        )
        .then(
          () => {
            if (!abortController.signal.aborted) {
              console.debug("Points synchronized");
              controller.draw();
            }
          },
          (reason: unknown) => {
            if (!abortController.signal.aborted) {
              console.error("Failed to synchronize points:", reason);
            }
          },
        );
    }
    return () => {
      abortController.abort();
    };
  }, [
    controllerVersion,
    syncPoints,
    layers,
    points,
    markerMaps,
    sizeMaps,
    colorMaps,
    visibilityMaps,
    opacityMaps,
    workspace,
    loadPoints,
    loadTable,
  ]);

  useEffect(() => {
    const abortController = new AbortController();
    const controller = controllerRef.current;
    if (controllerVersion && controller !== null) {
      console.debug("Synchronizing shapes");
      controller
        .synchronizeShapes(
          layers,
          shapes,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadShapes,
          loadTable,
          { signal: abortController.signal },
        )
        .then(
          () => {
            if (!abortController.signal.aborted) {
              console.debug("Shapes synchronized");
              controller.draw();
            }
          },
          (reason: unknown) => {
            if (!abortController.signal.aborted) {
              console.error("Failed to synchronize shapes:", reason);
            }
          },
        );
    }
    return () => {
      abortController.abort();
    };
  }, [
    controllerVersion,
    syncShapes,
    layers,
    shapes,
    colorMaps,
    visibilityMaps,
    opacityMaps,
    workspace,
    loadShapes,
    loadTable,
  ]);

  const resizeCanvas = useCallback(
    (size: { width: number; height: number }): void => {
      const controller = controllerRef.current;
      if (controllerVersion && controller !== null) {
        console.debug("Resizing WebGL canvas to", size);
        const canvasResized = controller.resizeCanvas(size);
        if (canvasResized) {
          controller.draw();
        }
      }
    },
    [controllerVersion],
  );

  const setViewport = useCallback(
    (viewport: Rect): void => {
      const controller = controllerRef.current;
      if (controllerVersion && controller !== null) {
        console.debug("Setting WebGL viewport to", viewport);
        const viewportChanged = controller.setViewport(viewport);
        if (viewportChanged) {
          controller.draw();
        }
      }
    },
    [controllerVersion],
  );

  return { resizeCanvas, setViewport };
}

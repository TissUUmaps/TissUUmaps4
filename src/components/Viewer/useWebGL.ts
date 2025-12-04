import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { useBoundStore } from "../../store/boundStore";
import { Rect } from "../../types";
import WebGLController from "./controllers/WebGLController";

export default function useWebGL(
  parent: Element | null,
  initialViewport: Rect | null,
) {
  const controllerRef = useRef<WebGLController | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [syncPoints, dispatchSyncPoints] = useReducer((pass) => pass + 1, 0);
  const [syncShapes, dispatchSyncShapes] = useReducer((pass) => pass + 1, 0);

  const layerMap = useBoundStore((state) => state.layerMap);
  const pointsMap = useBoundStore((state) => state.pointsMap);
  const shapesMap = useBoundStore((state) => state.shapesMap);
  const markerMaps = useBoundStore((state) => state.markerMaps);
  const sizeMaps = useBoundStore((state) => state.sizeMaps);
  const colorMaps = useBoundStore((state) => state.colorMaps);
  const visibilityMaps = useBoundStore((state) => state.visibilityMaps);
  const opacityMaps = useBoundStore((state) => state.opacityMaps);
  const projectDir = useBoundStore((state) => state.projectDir);
  const pointsDataLoaderFactories = useBoundStore(
    (state) => state.pointsDataLoaderFactories,
  );
  const shapesDataLoaderFactories = useBoundStore(
    (state) => state.shapesDataLoaderFactories,
  );
  const drawOptions = useBoundStore((state) => state.drawOptions);
  const loadPoints = useBoundStore((state) => state.loadPoints);
  const loadShapes = useBoundStore((state) => state.loadShapes);
  const loadTableByID = useBoundStore((state) => state.loadTableByID);

  useEffect(() => {
    const abortController = new AbortController();
    if (parent !== null && initialViewport !== null) {
      console.debug("Initializing WebGL");
      const canvas = WebGLController.createCanvas();
      parent.appendChild(canvas);
      const controller = new WebGLController(canvas, initialViewport);
      controllerRef.current = controller;
      controller.initialize({ signal: abortController.signal }).then(
        (controller) => {
          if (!abortController.signal.aborted) {
            setInitialized(true);
            console.debug("WebGL initialized");
            controller.draw();
          }
        },
        (reason) => {
          if (!abortController.signal.aborted) {
            console.error("Failed to initialize WebGL:", reason);
          }
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
      setInitialized(false);
    };
  }, [parent, initialViewport]);

  useEffect(() => {
    console.debug("Setting draw options");
    const controller = controllerRef.current;
    if (controller !== null) {
      const { syncPoints, syncShapes } = controller.setDrawOptions(drawOptions);
      controller.draw();
      if (syncPoints) {
        dispatchSyncPoints();
      }
      if (syncShapes) {
        dispatchSyncShapes();
      }
    }
  }, [drawOptions]);

  useEffect(() => {
    const abortController = new AbortController();
    const controller = controllerRef.current;
    if (controller !== null) {
      console.debug("Synchronizing points");
      controller
        .synchronizePoints(
          layerMap,
          pointsMap,
          markerMaps,
          sizeMaps,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadPoints,
          loadTableByID,
          { signal: abortController.signal },
        )
        .then(
          () => {
            if (!abortController.signal.aborted) {
              console.debug("Points synchronized");
              controller.draw();
            }
          },
          (reason) => {
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
    syncPoints,
    layerMap,
    pointsMap,
    markerMaps,
    sizeMaps,
    colorMaps,
    visibilityMaps,
    opacityMaps,
    projectDir,
    pointsDataLoaderFactories,
    loadPoints,
    loadTableByID,
  ]);

  useEffect(() => {
    const abortController = new AbortController();
    const controller = controllerRef.current;
    if (controller !== null) {
      console.debug("Synchronizing shapes");
      controller
        .synchronizeShapes(
          layerMap,
          shapesMap,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadShapes,
          loadTableByID,
          { signal: abortController.signal },
        )
        .then(
          () => {
            if (!abortController.signal.aborted) {
              console.debug("Shapes synchronized");
              controller.draw();
            }
          },
          (reason) => {
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
    syncShapes,
    layerMap,
    shapesMap,
    colorMaps,
    visibilityMaps,
    opacityMaps,
    projectDir,
    shapesDataLoaderFactories,
    loadShapes,
    loadTableByID,
  ]);

  const resizeCanvas = useCallback(
    (size: { width: number; height: number }) => {
      const controller = controllerRef.current;
      if (initialized && controller !== null) {
        console.debug("Resizing WebGL canvas to", size);
        const canvasResized = controller.resizeCanvas(size);
        if (canvasResized) {
          controller.draw();
        }
      }
    },
    [initialized],
  );

  const setViewport = useCallback(
    (viewport: Rect) => {
      const controller = controllerRef.current;
      if (initialized && viewport !== null && controller !== null) {
        console.debug("Setting WebGL viewport to", viewport);
        const viewportChanged = controller.setViewport(viewport);
        if (viewportChanged) {
          controller.draw();
        }
      }
    },
    [initialized],
  );

  return { resizeCanvas, setViewport };
}

import { useEffect, useRef, useState } from "react";

import { useBoundStore } from "../../store/boundStore";
import { Rect } from "../../types";
import WebGLController from "./controllers/WebGLController";

const syncShapesPassCycle = Number.MAX_SAFE_INTEGER - 1;
const drawPassCycle = Number.MAX_SAFE_INTEGER - 1;

export default function useWebGL(
  parent: HTMLElement | null,
  containerSize: { width: number; height: number } | null,
  viewportBounds: Rect | null,
) {
  const controllerRef = useRef<WebGLController | null>(null);

  const [initialized, setInitialized] = useState<boolean>(false);
  const [syncShapesPass, setSyncShapesPass] = useState<number>(0);
  const [drawPass, setDrawPass] = useState<number>(0);

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

  // initialize the WebGL controller
  useEffect(() => {
    const abortController = new AbortController();
    if (parent !== null) {
      const canvas = parent.appendChild(WebGLController.createCanvas());
      controllerRef.current = new WebGLController(canvas);
      controllerRef.current.initialize({ signal: abortController.signal }).then(
        () => {
          setInitialized(true);
        },
        (reason) => {
          if (!abortController.signal.aborted) {
            console.error(reason);
          }
        },
      );
    }
    return () => {
      abortController.abort("WebGL cleanup");
      if (controllerRef.current !== null) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
      setInitialized(false);
    };
  }, [parent]);

  // set draw options and redraw upon configuration changes
  useEffect(() => {
    if (controllerRef.current !== null) {
      const { syncShapes } = controllerRef.current.setDrawOptions(drawOptions);
      if (syncShapes) {
        setSyncShapesPass((p) => (p + 1) % syncShapesPassCycle);
      }
      setDrawPass((p) => (p + 1) % drawPassCycle);
    }
  }, [drawOptions]);

  // synchronize points and redraw upon layer/points changes
  useEffect(() => {
    const abortController = new AbortController();
    if (controllerRef.current !== null) {
      controllerRef.current
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
            setDrawPass((p) => (p + 1) % drawPassCycle);
          },
          (reason) => {
            if (!abortController.signal.aborted) {
              console.error(reason);
            }
          },
        );
    }
    return () => {
      abortController.abort("WebGL cleanup");
    };
  }, [
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

  // synchronize shapes and redraw upon layer/shapes changes
  useEffect(() => {
    const abortController = new AbortController();
    if (controllerRef.current !== null) {
      controllerRef.current
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
            setDrawPass((p) => (p + 1) % drawPassCycle);
          },
          (reason) => {
            if (!abortController.signal.aborted) {
              console.error(reason);
            }
          },
        );
    }
    return () => {
      abortController.abort("WebGL cleanup");
    };
  }, [
    syncShapesPass,
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

  // resize and redraw upon canvas size changes
  useEffect(() => {
    if (
      initialized &&
      containerSize !== null &&
      controllerRef.current !== null
    ) {
      controllerRef.current.resize(containerSize.width, containerSize.height);
      setDrawPass((p) => (p + 1) % drawPassCycle);
    }
  }, [initialized, containerSize]);

  // redraw when necessary (incl. viewport changes)
  useEffect(() => {
    if (
      initialized &&
      viewportBounds !== null &&
      controllerRef.current !== null
    ) {
      controllerRef.current.draw(viewportBounds);
    }
  }, [drawPass, initialized, viewportBounds]);
}

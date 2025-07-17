import { useCallback, useEffect, useRef } from "react";

import OpenSeadragonController from "../controllers/OpenSeadragonController";
import WebGLController from "../controllers/WebGLController";
import { useBoundStore } from "../stores/boundStore";

export default function ViewerPanel() {
  const openSeadragonControllerRef = useRef<OpenSeadragonController | null>(
    null,
  );
  const webGLControllerRef = useRef<WebGLController | null>(null);
  const projectDir = useBoundStore((state) => state.projectDir);
  const layerMap = useBoundStore((state) => state.layerMap);
  const imageMap = useBoundStore((state) => state.imageMap);
  const labelsMap = useBoundStore((state) => state.labelsMap);
  const pointsMap = useBoundStore((state) => state.pointsMap);
  const shapesMap = useBoundStore((state) => state.shapesMap);
  const loadImage = useBoundStore((state) => state.loadImage);
  const loadLabels = useBoundStore((state) => state.loadLabels);
  const loadPoints = useBoundStore((state) => state.loadPoints);
  const loadShapes = useBoundStore((state) => state.loadShapes);
  const imageDataLoaderFactories = useBoundStore(
    (state) => state.imageDataLoaderFactories,
  );
  const labelsDataLoaderFactories = useBoundStore(
    (state) => state.labelsDataLoaderFactories,
  );
  const pointsDataLoaderFactories = useBoundStore(
    (state) => state.pointsDataLoaderFactories,
  );
  const shapesDataLoaderFactories = useBoundStore(
    (state) => state.shapesDataLoaderFactories,
  );

  // use a ref callback for initializing the OpenSeadragon viewer and the WebGL canvas
  // https://react.dev/reference/react-dom/components/common#ref-callback
  const setViewerRef = useCallback((viewerElement: HTMLDivElement | null) => {
    if (webGLControllerRef.current !== null) {
      webGLControllerRef.current.destroy();
      webGLControllerRef.current = null;
    }
    if (openSeadragonControllerRef.current !== null) {
      openSeadragonControllerRef.current.destroy();
      openSeadragonControllerRef.current = null;
    }
    if (viewerElement !== null) {
      openSeadragonControllerRef.current = new OpenSeadragonController(
        viewerElement,
      );
      webGLControllerRef.current = new WebGLController(
        openSeadragonControllerRef.current.getCanvas(),
      );
    }
  }, []);

  // synchronize the OpenSeadragon viewer upon layer/image/labels changes
  // (note: useEffect hooks are executed after ref callbacks used for initialization)
  useEffect(() => {
    let isCurrent = true;
    const os = openSeadragonControllerRef.current;
    if (os !== null) {
      os.synchronize(
        layerMap,
        imageMap,
        labelsMap,
        loadImage,
        loadLabels,
        () => isCurrent,
      ).catch(console.error);
    }
    return () => {
      isCurrent = false;
    };
  }, [
    projectDir,
    layerMap,
    imageMap,
    labelsMap,
    loadImage,
    loadLabels,
    imageDataLoaderFactories,
    labelsDataLoaderFactories,
  ]);

  // synchronize the WebGL canvas upon layer/points/shapes changes
  // (note: useEffect hooks are executed after ref callbacks used for initialization)
  useEffect(() => {
    let isCurrent = true;
    const gl = webGLControllerRef.current;
    if (gl !== null) {
      gl.synchronize(
        layerMap,
        pointsMap,
        shapesMap,
        loadPoints,
        loadShapes,
        () => isCurrent,
      ).catch(console.error);
    }
    return () => {
      isCurrent = false;
    };
  }, [
    projectDir,
    layerMap,
    pointsMap,
    shapesMap,
    loadPoints,
    loadShapes,
    pointsDataLoaderFactories,
    shapesDataLoaderFactories,
  ]);

  return <div ref={setViewerRef} className="size-full bg-white" />;
}

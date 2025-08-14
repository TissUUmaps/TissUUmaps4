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
  const sizeMaps = useBoundStore((state) => state.sizeMaps);
  const colorMaps = useBoundStore((state) => state.colorMaps);
  const visibilityMaps = useBoundStore((state) => state.visibilityMaps);
  const opacityMaps = useBoundStore((state) => state.opacityMaps);
  const markerMaps = useBoundStore((state) => state.markerMaps);
  const loadImage = useBoundStore((state) => state.loadImage);
  const loadLabels = useBoundStore((state) => state.loadLabels);
  const loadPoints = useBoundStore((state) => state.loadPoints);
  const loadShapes = useBoundStore((state) => state.loadShapes);
  const loadTableByID = useBoundStore((state) => state.loadTableByID);
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
      let os;
      let gl;
      try {
        os = new OpenSeadragonController(viewerElement);
        gl = new WebGLController(os.getViewer().canvas);
      } catch (error) {
        console.error("Failed to initialize viewer", error);
        os = null;
        gl = null;
      }
      // TODO register necessary OpenSeadragon events
      // if (os !== null && gl !== null) {
      //   const viewer = os.getViewer();
      // }
      openSeadragonControllerRef.current = os;
      webGLControllerRef.current = gl;
    }
  }, []);

  // synchronize the OpenSeadragon viewer upon layer/image/labels changes
  // (note: useEffect hooks are executed after ref callbacks used for initialization)
  useEffect(() => {
    let abort = false;
    const os = openSeadragonControllerRef.current;
    if (os !== null) {
      os.synchronize(
        layerMap,
        imageMap,
        labelsMap,
        loadImage,
        loadLabels,
        () => abort,
      ).catch(console.error);
    }
    return () => {
      abort = true;
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

  // synchronize the WebGL canvas upon layer/points changes
  // (note: useEffect hooks are executed after ref callbacks used for initialization)
  useEffect(() => {
    let abort = false;
    const gl = webGLControllerRef.current;
    if (gl !== null) {
      gl.getContext()
        .synchronizePoints(
          layerMap,
          pointsMap,
          sizeMaps,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          markerMaps,
          loadPoints,
          loadTableByID,
          () => abort,
        )
        .catch(console.error);
    }
    return () => {
      abort = true;
    };
  }, [
    projectDir,
    layerMap,
    pointsMap,
    sizeMaps,
    colorMaps,
    visibilityMaps,
    opacityMaps,
    markerMaps,
    loadPoints,
    loadTableByID,
    pointsDataLoaderFactories,
  ]);

  // synchronize the WebGL canvas upon layer/shapes changes
  // (note: useEffect hooks are executed after ref callbacks used for initialization)
  useEffect(() => {
    let abort = false;
    const gl = webGLControllerRef.current;
    if (gl !== null) {
      gl.getContext()
        .synchronizeShapes(
          layerMap,
          shapesMap,
          loadShapes,
          loadTableByID,
          () => abort,
        )
        .catch(console.error);
    }
    return () => {
      abort = true;
    };
  }, [
    projectDir,
    layerMap,
    shapesMap,
    loadShapes,
    loadTableByID,
    shapesDataLoaderFactories,
  ]);

  return <div ref={setViewerRef} className="size-full bg-white" />;
}

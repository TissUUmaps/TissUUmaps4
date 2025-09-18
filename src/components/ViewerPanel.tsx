import OpenSeadragon from "openseadragon";
import { useCallback, useEffect, useRef } from "react";

import OpenSeadragonController from "../controllers/OpenSeadragonController";
import WebGLManager from "../controllers/WebGLManager";
import { useBoundStore } from "../stores/boundStore";

export default function ViewerPanel() {
  const osRef = useRef<OpenSeadragonController | null>(null);
  const glRef = useRef<WebGLManager | null>(null);
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

  const onViewerResize = useCallback((e: OpenSeadragon.ResizeEvent) => {
    const gl = glRef.current;
    if (gl !== null) {
      gl.canvas.width = e.newContainerSize.x;
      gl.canvas.height = e.newContainerSize.y;
      gl.pointsController.draw(e.eventSource.viewport.getBounds(true));
      gl.shapesController.draw(e.eventSource.viewport.getBounds(true));
    }
  }, []);

  const onViewerViewportChange = useCallback((e: OpenSeadragon.ViewerEvent) => {
    const gl = glRef.current;
    if (gl !== null) {
      gl.pointsController.draw(e.eventSource.viewport.getBounds(true));
      gl.shapesController.draw(e.eventSource.viewport.getBounds(true));
    }
  }, []);

  // use a ref callback for initializing the OpenSeadragon viewer and the WebGL canvas
  // https://react.dev/reference/react-dom/components/common#ref-callback
  const setViewerRef = useCallback(
    (viewerElement: HTMLDivElement | null) => {
      const oldOS = osRef.current;
      if (oldOS !== null) {
        oldOS.destroy();
        osRef.current = null;
      }
      const oldGL = glRef.current;
      if (oldGL !== null) {
        oldGL.destroy();
        glRef.current = null;
      }
      if (viewerElement !== null) {
        try {
          const newOS = new OpenSeadragonController(viewerElement);
          const newGL = new WebGLManager(createWebGLCanvas(newOS.viewer));
          newOS.viewer.addHandler("resize", onViewerResize);
          newOS.viewer.addHandler("viewport-change", onViewerViewportChange);
          osRef.current = newOS;
          glRef.current = newGL;
        } catch (error) {
          console.error("Failed to initialize viewer", error);
          osRef.current = null;
          glRef.current = null;
        }
      }
    },
    [onViewerResize, onViewerViewportChange],
  );

  // synchronize the OpenSeadragon viewer upon layer/image/labels changes
  // (note: useEffect hooks are executed after ref callbacks used for initialization)
  useEffect(() => {
    let abort = false;
    const os = osRef.current;
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
    const gl = glRef.current;
    if (gl !== null) {
      gl.pointsController
        .synchronize(
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
      const os = osRef.current;
      if (os !== null) {
        gl.pointsController.draw(os.viewer.viewport.getBounds(true));
      }
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
    const gl = glRef.current;
    if (gl !== null) {
      gl.shapesController
        .synchronize(
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

function createWebGLCanvas(viewer: OpenSeadragon.Viewer): HTMLCanvasElement {
  const viewerCanvas = viewer.drawer.canvas as HTMLCanvasElement;
  const webGLCanvas = document.createElement("canvas");
  webGLCanvas.width = viewerCanvas.width;
  webGLCanvas.height = viewerCanvas.height;
  webGLCanvas.style = "position: relative; width: 100%; height: 100%;";
  viewerCanvas.appendChild(webGLCanvas);
  return webGLCanvas;
}

import { ResizeEvent, ViewerEvent } from "openseadragon";
import { useCallback, useEffect, useRef } from "react";

import OpenSeadragonController from "../controllers/OpenSeadragonController";
import WebGLController from "../controllers/WebGLController";
import { useBoundStore } from "../stores/boundStore";

// TODO refactor ViewerPanel into its own component library/package

export default function ViewerPanel() {
  const osRef = useRef<OpenSeadragonController | null>(null);
  const glRef = useRef<WebGLController | null>(null);
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
  const blendMode = useBoundStore((state) => state.blendMode);
  const pointSizeFactor = useBoundStore((state) => state.pointSizeFactor);
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

  const onViewerResize = useCallback((e: ResizeEvent) => {
    const gl = glRef.current;
    if (gl !== null) {
      gl.resize(e.newContainerSize.x, e.newContainerSize.y);
      gl.draw(e.eventSource.viewport.getBounds(true));
    }
  }, []);

  const onViewerViewportChange = useCallback((e: ViewerEvent) => {
    const gl = glRef.current;
    if (gl !== null) {
      gl.draw(e.eventSource.viewport.getBounds(true));
    }
  }, []);

  // use a ref callback for initializing the OpenSeadragon viewer and the WebGL canvas
  // https://react.dev/reference/react-dom/components/common#ref-callback
  const setViewerRef = useCallback(
    (viewerElement: HTMLDivElement | null) => {
      const os = osRef.current;
      if (os !== null) {
        os.destroy();
        osRef.current = null;
      }
      const gl = glRef.current;
      if (gl !== null) {
        gl.destroy();
        glRef.current = null;
      }
      if (viewerElement !== null) {
        try {
          const viewer = OpenSeadragonController.createViewer(viewerElement);
          viewer.addHandler("resize", onViewerResize);
          viewer.addHandler("viewport-change", onViewerViewportChange);
          const glCanvas = viewer.canvas.appendChild(
            WebGLController.createCanvas(),
          );
          const os = new OpenSeadragonController(viewer);
          const gl = new WebGLController(glCanvas);
          const containerSize = viewer.viewport.getContainerSize();
          gl.resize(containerSize.x, containerSize.y);
          gl.draw(os.getViewportBounds());
          osRef.current = os;
          glRef.current = gl;
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
      gl.synchronizePoints(
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
      ).catch(console.error);
      const os = osRef.current;
      if (os !== null) {
        gl.draw(os.getViewportBounds());
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
      gl.synchronizeShapes(
        layerMap,
        shapesMap,
        loadShapes,
        loadTableByID,
        () => abort,
      ).catch(console.error);
      const os = osRef.current;
      if (os !== null) {
        gl.draw(os.getViewportBounds());
      }
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

  // redraw upon WebGL configuration changes
  useEffect(() => {
    const gl = glRef.current;
    if (gl !== null) {
      let redraw: boolean = false;
      if (gl.blendMode !== blendMode) {
        gl.blendMode = blendMode;
        redraw = true;
      }
      if (gl.pointSizeFactor !== pointSizeFactor) {
        gl.pointSizeFactor = pointSizeFactor;
        redraw = true;
      }
      if (redraw) {
        const os = osRef.current;
        if (os !== null) {
          gl.draw(os.getViewportBounds());
        }
      }
    }
  }, [blendMode, pointSizeFactor]);

  return <div ref={setViewerRef} className="size-full bg-white" />;
}

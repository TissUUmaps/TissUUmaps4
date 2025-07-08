import { useCallback, useEffect, useRef } from "react";

import OpenSeadragonController from "../controllers/OpenSeadragonController";
import WebGLController from "../controllers/WebGLController";
import { useBoundStore } from "../stores/boundStore";

export default function ViewerPanel() {
  const glRef = useRef<WebGLController | null>(null);
  const osdRef = useRef<OpenSeadragonController | null>(null);
  const layers = useBoundStore((state) => state.layers);
  const images = useBoundStore((state) => state.images);
  const labels = useBoundStore((state) => state.labels);
  const points = useBoundStore((state) => state.points);
  const shapes = useBoundStore((state) => state.shapes);
  const imageData = useBoundStore((state) => state.imageData);
  const labelsData = useBoundStore((state) => state.labelsData);
  const pointsData = useBoundStore((state) => state.pointsData);
  const shapesData = useBoundStore((state) => state.shapesData);

  // use a ref callback for initializing the OpenSeadragon viewer and the WebGL canvas
  // https://react.dev/reference/react-dom/components/common#ref-callback
  const setViewerRef = useCallback((viewerElement: HTMLDivElement | null) => {
    let gl = glRef.current;
    let osd = osdRef.current;
    if (gl !== null) {
      gl.destroy();
      gl = glRef.current = null;
    }
    if (osd !== null) {
      osd.destroy();
      osd = osdRef.current = null;
    }
    if (viewerElement !== null) {
      osd = osdRef.current = new OpenSeadragonController(viewerElement);
      gl = glRef.current = new WebGLController(osd.getDrawer().canvas);
    }
  }, []);

  // refresh the OpenSeadragon viewer upon layer/image/labels/data changes
  // (note: useEffect hooks are executed after ref callbacks used for initialization)
  useEffect(() => {
    const osd = osdRef.current;
    if (osd) {
      osd.synchronize(layers, images, labels, imageData, labelsData);
    }
  }, [layers, images, labels, imageData, labelsData]);

  // refresh the WebGL canvas upon layer/points/shapes/data changes
  // (note: useEffect hooks are executed after ref callbacks used for initialization)
  useEffect(() => {
    const gl = glRef.current;
    if (gl) {
      gl.synchronize(layers, points, shapes, pointsData, shapesData);
    }
  }, [layers, points, shapes, pointsData, shapesData]);

  return <div ref={setViewerRef} />;
}

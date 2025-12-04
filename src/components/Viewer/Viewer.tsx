import { useCallback, useEffect, useRef } from "react";

import { Rect } from "../../types";
import useOpenSeadragon from "./useOpenSeadragon";
import useWebGL from "./useWebGL";

export default function Viewer() {
  const glRef = useRef<ReturnType<typeof useWebGL> | null>(null);
  const resizeGLCanvas = useCallback(
    (newContainerSize: { width: number; height: number }) => {
      const gl = glRef.current;
      if (gl !== null) {
        gl.resizeCanvas(newContainerSize);
      }
    },
    [],
  );
  const setGLViewport = useCallback((newViewport: Rect) => {
    const gl = glRef.current;
    if (gl !== null) {
      gl.setViewport(newViewport);
    }
  }, []);
  const { viewerElementRef, viewerState } = useOpenSeadragon({
    containerResizedHandler: resizeGLCanvas,
    viewportChangedHandler: setGLViewport,
  });
  const gl = useWebGL(viewerState.canvas, viewerState.initialViewport);
  useEffect(() => {
    glRef.current = gl;
  }, [gl]);
  return <div ref={viewerElementRef} className="size-full bg-white" />;
}

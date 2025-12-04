import { useCallback, useRef } from "react";

import { Rect } from "../../types";
import useOpenSeadragon from "./useOpenSeadragon";
import useWebGL from "./useWebGL";

export default function Viewer() {
  const glRef = useRef<ReturnType<typeof useWebGL> | null>(null);
  const osContainerResizedHandler = useCallback(
    (newContainerSize: { width: number; height: number }) => {
      const gl = glRef.current;
      if (gl !== null) {
        gl.resizeCanvas(newContainerSize);
      }
    },
    [],
  );
  const osViewportChangedHandler = useCallback((newViewport: Rect) => {
    const gl = glRef.current;
    if (gl !== null) {
      gl.setViewport(newViewport);
    }
  }, []);
  const { viewerElementRef, viewerState } = useOpenSeadragon({
    containerResizedHandler: osContainerResizedHandler,
    viewportChangedHandler: osViewportChangedHandler,
  });
  glRef.current = useWebGL(viewerState.canvas, viewerState.initialViewport);
  return <div ref={viewerElementRef} className="size-full bg-white" />;
}

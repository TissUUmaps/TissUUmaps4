import { type HTMLProps, useCallback, useEffect, useRef } from "react";

import { type Rect } from "@tissuumaps/core";

import { useOpenSeadragon } from "../../hooks/useOpenSeadragon";
import { useWebGL } from "../../hooks/useWebGL";

export function Viewer(props: HTMLProps<HTMLDivElement>) {
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
  return <div ref={viewerElementRef} {...props} />;
}

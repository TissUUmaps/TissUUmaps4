import { useEffect, useMemo, useState } from "react";

import { type OpenSeadragonController } from "@tissuumaps/core";

import { type ViewerAdapter } from "../../adapter";
import { useOpenSeadragon } from "../../hooks/useOpenSeadragon";
import { useSVG } from "../../hooks/useSVG";
import { useWebGL } from "../../hooks/useWebGL";

export type ViewerProps = { adapter: ViewerAdapter; className?: string };

export function Viewer({ adapter, className }: ViewerProps) {
  const [os, setOS] = useState<OpenSeadragonController | null>(null);

  const { setViewerElementRef, controllerRef: osRef } =
    useOpenSeadragon(adapter);

  const parent = useMemo(() => os?.viewer.canvas ?? null, [os]);
  const viewport = useMemo(
    () => os?.viewer.viewport.getBoundsNoRotate(true) ?? null,
    [os],
  );
  const { controllerRef: glRef } = useWebGL(adapter, parent, viewport);
  const { controllerRef: svgRef } = useSVG(adapter, parent, viewport);

  useEffect(() => {
    const os = osRef.current;
    const resizeHandler = (event: OpenSeadragon.ResizeEvent) => {
      console.debug("Resizing WebGL canvas and SVG container");
      const newSize = {
        width: event.newContainerSize.x,
        height: event.newContainerSize.y,
      };
      const gl = glRef.current;
      if (gl !== null) {
        const canvasResized = gl.resizeCanvas(newSize);
        if (canvasResized) {
          gl.draw();
        }
      }
      const svg = svgRef.current;
      if (svg !== null) {
        svg.resizeContainer(newSize);
      }
    };
    const viewportChangeHandler = (event: OpenSeadragon.ViewerEvent) => {
      console.debug("Changing WebGL viewport and SVG viewport");
      const newViewport = event.eventSource.viewport.getBoundsNoRotate(true);
      const gl = glRef.current;
      if (gl !== null) {
        const viewportChanged = gl.setViewport(newViewport);
        if (viewportChanged) {
          gl.draw();
        }
      }
      const svg = svgRef.current;
      if (svg !== null) {
        svg.setViewport(newViewport);
      }
    };
    if (os !== null) {
      setOS(os);
      os.viewer.addHandler("resize", resizeHandler);
      os.viewer.addHandler("viewport-change", viewportChangeHandler);
    }
    return () => {
      if (os !== null) {
        os.viewer.removeHandler("resize", resizeHandler);
        os.viewer.removeHandler("viewport-change", viewportChangeHandler);
      }
    };
  }, [osRef, glRef, svgRef, setOS]);

  return <div ref={setViewerElementRef} className={className} />;
}

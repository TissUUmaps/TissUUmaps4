import { useEffect, useMemo, useState } from "react";

import { type OpenSeadragonController } from "@tissuumaps/core";

import { type ViewerAdapter } from "../../adapter";
import { useOpenSeadragon } from "../../hooks/useOpenSeadragon";
import { useWebGL } from "../../hooks/useWebGL";

export type ViewerProps = { adapter: ViewerAdapter; className?: string };

export function Viewer({ adapter, className }: ViewerProps) {
  const [os, setOS] = useState<OpenSeadragonController | null>(null);

  const { setViewerElementRef, controllerRef: osRef } =
    useOpenSeadragon(adapter);

  const glCanvas = useMemo(() => os?.viewer.canvas ?? null, [os]);
  const glViewport = useMemo(
    () => os?.viewer.viewport.getBoundsNoRotate(true) ?? null,
    [os],
  );
  const { controllerRef: glRef } = useWebGL(adapter, glCanvas, glViewport);

  useEffect(() => {
    const os = osRef.current;
    const resizeHandler = (event: OpenSeadragon.ResizeEvent) => {
      const gl = glRef.current;
      if (gl !== null) {
        console.debug("Resizing WebGL canvas");
        const canvasResized = gl.resizeCanvas({
          width: event.newContainerSize.x,
          height: event.newContainerSize.y,
        });
        if (canvasResized) {
          gl.draw();
        }
      }
    };
    const viewportChangeHandler = (event: OpenSeadragon.ViewerEvent) => {
      const gl = glRef.current;
      if (gl !== null) {
        console.debug("Changing WebGL viewport");
        const viewportChanged = gl.setViewport(
          event.eventSource.viewport.getBoundsNoRotate(true),
        );
        if (viewportChanged) {
          gl.draw();
        }
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
  }, [osRef, glRef, setOS]);

  return <div ref={setViewerElementRef} className={className} />;
}

import { type ReactNode, useCallback, useEffect, useState } from "react";

import { type OpenSeadragonController } from "@tissuumaps/core";

import { type ViewerAdapter } from "../../adapter";
import { OpenSeadragonControllerProvider } from "../../context/OpenSeadragonControllerProvider";
import { useOpenSeadragon } from "../../hooks/useOpenSeadragon";
import { useSVG } from "../../hooks/useSVG";
import { useWebGL } from "../../hooks/useWebGL";

export type ViewerProps = {
  adapter: ViewerAdapter;
  children?: ReactNode;
  className?: string;
};

export function Viewer({ adapter, children, className }: ViewerProps) {
  const [os, setOS] = useState<OpenSeadragonController | null>(null);

  const { controllerRef: glRef, controllerReady: glReady } = useWebGL(
    adapter,
    os !== null ? os.viewer.canvas : null,
  );

  const { controllerRef: svgRef, controllerReady: svgReady } = useSVG(
    adapter,
    os !== null ? os.viewer.canvas : null,
  );

  const fallbackBounds = useCallback(
    () => glRef.current?.getWorldBounds() ?? null,
    [glRef],
  );
  const {
    setViewerElementRef,
    controllerRef: osRef,
    controllerReady: osReady,
  } = useOpenSeadragon(adapter, fallbackBounds);

  useEffect(() => {
    const os = osRef.current;
    const gl = glRef.current;
    const svg = svgRef.current;

    const resizeHandler = (event: OpenSeadragon.ResizeEvent) => {
      const containerSize = {
        width: event.newContainerSize.x,
        height: event.newContainerSize.y,
      };
      if (glReady && gl !== null) {
        const canvasResized = gl.resizeCanvas(containerSize);
        if (canvasResized) {
          gl.draw();
        }
      }
      if (svgReady && svg !== null) {
        svg.resizeContainer(containerSize);
      }
    };

    const viewportChangeHandler = (event: OpenSeadragon.ViewerEvent) => {
      const viewport = event.eventSource.viewport.getBoundsNoRotate(true);
      if (glReady && gl !== null) {
        const viewportChanged = gl.setViewport(viewport);
        if (viewportChanged) {
          gl.draw();
        }
      }
      if (svgReady && svg !== null) {
        svg.setViewport(viewport);
      }
    };

    if (osReady && os !== null) {
      os.viewer.addHandler("resize", resizeHandler);
      os.viewer.addHandler("viewport-change", viewportChangeHandler);
      setOS(os);
    }

    return () => {
      if (os !== null) {
        os.viewer.removeHandler("resize", resizeHandler);
        os.viewer.removeHandler("viewport-change", viewportChangeHandler);
      }
    };
  }, [osRef, osReady, glRef, glReady, svgRef, svgReady]);

  return (
    <div ref={setViewerElementRef} className={className}>
      <OpenSeadragonControllerProvider controller={os}>
        {children}
      </OpenSeadragonControllerProvider>
    </div>
  );
}

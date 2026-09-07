import { type ReactNode, useCallback, useEffect, useState } from "react";

import { GeometryUtils, type Rect } from "@tissuumaps/core";
import type { OpenSeadragonContext } from "@tissuumaps/render";

import type { ViewerAdapter } from "../../adapter";
import { OpenSeadragonContextProvider } from "../../context/OpenSeadragonContextProvider";
import { useOpenSeadragon } from "../../hooks/useOpenSeadragon";
import { useSVG } from "../../hooks/useSVG";
import { useWebGL } from "../../hooks/useWebGL";

export type ViewerProps = {
  adapter: ViewerAdapter;
  children?: ReactNode;
  className?: string;
};

export function Viewer({ adapter, children, className }: ViewerProps) {
  const [osContext, setOSContext] = useState<OpenSeadragonContext | null>(null);

  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const updateContainerSize = useCallback(
    (newContainerSize: { width: number; height: number }) => {
      setContainerSize((oldContainerSize) =>
        oldContainerSize !== null &&
        GeometryUtils.dimsEquals(oldContainerSize, newContainerSize)
          ? oldContainerSize
          : newContainerSize,
      );
    },
    [],
  );

  const { initOS, osRef, osReady, updateOSExternalBounds } =
    useOpenSeadragon(adapter);
  const { initGL, setGLViewport, glPointsBounds, glShapesBounds } = useWebGL(
    adapter,
    containerSize,
  );
  const { initSVG, setSVGViewport } = useSVG(adapter, containerSize);

  useEffect(() => {
    const os = osRef.current;
    if (!osReady || os === null) {
      return;
    }
    setOSContext(os.context);
    // Push the viewport straight into the renderers instead of through React
    // state: a passive useEffect runs after paint, so the overlay would lag
    // one frame behind the OSD canvas. With the default animationTime of 0,
    // OSD applies the viewport synchronously, so drawing here lands in the
    // same paint.
    const updateViewport = (viewport: Rect) => {
      setGLViewport(viewport);
      setSVGViewport(viewport);
    };
    updateViewport(os.context.getViewport());
    updateContainerSize(os.context.getContainerSize());
    const onViewportChanged = (event: OpenSeadragon.ViewerEvent) => {
      const { x, y, width, height } =
        event.eventSource.viewport.getBounds(true);
      updateViewport({ x, y, width, height });
    };
    const onContainerResized = (event: OpenSeadragon.ResizeEvent) => {
      const { x: width, y: height } = event.newContainerSize;
      updateContainerSize({ width, height });
    };
    os.context.viewer.addHandler("resize", onContainerResized);
    os.context.viewer.addHandler("viewport-change", onViewportChanged);
    const destroyGL = initGL(os.context.viewer.canvas);
    const destroySVG = initSVG(os.context.viewer.canvas);
    return () => {
      destroyGL();
      destroySVG();
      os.context.viewer.removeHandler("resize", onContainerResized);
      os.context.viewer.removeHandler("viewport-change", onViewportChanged);
      setContainerSize(null);
      setOSContext(null);
    };
  }, [
    osReady,
    osRef,
    initGL,
    initSVG,
    setGLViewport,
    setSVGViewport,
    updateContainerSize,
  ]);

  useEffect(() => {
    const osExternalBounds = [];
    if (glPointsBounds !== null) {
      osExternalBounds.push(glPointsBounds);
    }
    if (glShapesBounds !== null) {
      osExternalBounds.push(glShapesBounds);
    }
    return updateOSExternalBounds(osExternalBounds);
  }, [updateOSExternalBounds, glPointsBounds, glShapesBounds]);

  return (
    <div ref={initOS} className={className}>
      <OpenSeadragonContextProvider context={osContext}>
        {children}
      </OpenSeadragonContextProvider>
    </div>
  );
}

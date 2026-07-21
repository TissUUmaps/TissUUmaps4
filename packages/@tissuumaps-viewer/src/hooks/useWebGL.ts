import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import type { Rect } from "@tissuumaps/core";
import {
  WebGLContext,
  WebGLPointsRenderer,
  WebGLShapesRenderer,
} from "@tissuumaps/render";

import type { ViewerAdapter } from "../adapter";

type GL = {
  canvas: HTMLCanvasElement;
  context: WebGLContext;
  pointsRenderer: WebGLPointsRenderer;
  shapesRenderer: WebGLShapesRenderer;
};

export function useWebGL(
  adapter: ViewerAdapter,
  viewport: Rect | null,
  containerSize: { width: number; height: number } | null,
) {
  const {
    workspace,
    layers,
    points,
    shapes,
    markerMaps,
    sizeMaps,
    colorMaps,
    visibilityMaps,
    opacityMaps,
    glOptions,
    loadPoints,
    loadShapes,
    loadTable,
  } = adapter;

  const glRef = useRef<GL | null>(null);
  const glPromiseRef = useRef<Promise<GL | null>>(Promise.resolve(null));
  const [glReady, setGLReady] = useState(false);

  const glOptionsRef = useRef(glOptions);
  const viewportRef = useRef(viewport);
  const containerSizeRef = useRef(containerSize);

  const [syncPoints, dispatchSyncPoints] = useReducer((x) => x + 1, 0);
  const [syncShapes, dispatchSyncShapes] = useReducer((x) => x + 1, 0);

  const [glPointsBounds, setGLPointsBounds] = useState<Rect | null>(null);
  const [glShapesBounds, setGLShapesBounds] = useState<Rect | null>(null);

  function createCanvas() {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    return canvas;
  }

  function draw() {
    if (glRef.current !== null) {
      glRef.current.context.clear();
      glRef.current.pointsRenderer.draw();
      glRef.current.shapesRenderer.draw();
    }
  }

  const initGL = useCallback((parentOrNull: HTMLElement | null) => {
    if (parentOrNull === null) {
      return () => {};
    }
    const abortController = new AbortController();
    const canvas = parentOrNull.appendChild(createCanvas());

    async function startGL() {
      abortController.signal.throwIfAborted();
      const context = new WebGLContext(canvas);
      if (containerSizeRef.current !== null) {
        context.resizeCanvas(canvas, containerSizeRef.current);
      }
      let pointsRenderer: WebGLPointsRenderer | undefined;
      try {
        pointsRenderer = await new Promise<WebGLPointsRenderer>(
          (resolve, reject) => {
            try {
              const pointsRenderer = new WebGLPointsRenderer(
                context,
                () => resolve(pointsRenderer),
                reject,
                {
                  viewport: viewportRef.current ?? undefined,
                  renderOptions: glOptionsRef.current.pointsRenderOptions,
                  signal: abortController.signal,
                },
              );
            } catch (error) {
              reject(
                new Error("Error creating points renderer", { cause: error }),
              );
            }
          },
        );
        abortController.signal.throwIfAborted();
      } catch (error) {
        if (pointsRenderer !== undefined) {
          pointsRenderer.destroy();
        }
        context.destroy();
        throw error;
      }
      let shapesRenderer: WebGLShapesRenderer | undefined;
      try {
        shapesRenderer = new WebGLShapesRenderer(context, {
          viewport: viewportRef.current ?? undefined,
          renderOptions: glOptionsRef.current.shapesRenderOptions,
        });
      } catch (error) {
        pointsRenderer.destroy();
        context.destroy();
        throw new Error("Error creating shapes renderer", { cause: error });
      }
      const gl = { canvas, context, pointsRenderer, shapesRenderer };
      glRef.current = gl;
      setGLReady(true);
      draw();
      return gl;
    }

    function stopGL() {
      const gl = glRef.current;
      setGLReady(false);
      glRef.current = null;
      if (gl !== null) {
        const { context, pointsRenderer, shapesRenderer } = gl;
        pointsRenderer.destroy();
        shapesRenderer.destroy();
        context.destroy();
      }
    }

    glPromiseRef.current = glPromiseRef.current.then(startGL).catch((error) => {
      if (!abortController.signal.aborted) {
        console.error("Error starting WebGL", error);
      }
      return null;
    });
    const onContextLost = (event: Event) => {
      event.preventDefault(); // allow context to be restored
      glPromiseRef.current = glPromiseRef.current
        .then(() => {
          stopGL();
          return null;
        })
        .catch((error) => {
          console.error("Error stopping WebGL", error);
          return null;
        });
    };
    const onContextRestored = () => {
      glPromiseRef.current = glPromiseRef.current
        .then(startGL)
        .catch((error) => {
          if (!abortController.signal.aborted) {
            console.error("Error starting WebGL", error);
          }
          return null;
        });
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    return () => {
      abortController.abort();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      glPromiseRef.current = glPromiseRef.current
        .then(() => {
          stopGL();
          return null;
        })
        .catch((error) => {
          console.error("Error stopping WebGL", error);
          return null;
        });
      parentOrNull.removeChild(canvas);
    };
  }, []);

  useEffect(() => {
    glOptionsRef.current = glOptions;
    if (glReady && glRef.current !== null) {
      const { resync: resyncPoints, redraw: redrawPoints } =
        glRef.current.pointsRenderer.setRenderOptions(
          glOptions.pointsRenderOptions,
        );
      const { resync: resyncShapes, redraw: redrawShapes } =
        glRef.current.shapesRenderer.setRenderOptions(
          glOptions.shapesRenderOptions,
        );
      if (redrawPoints || redrawShapes) {
        draw();
      }
      if (resyncPoints) {
        dispatchSyncPoints();
      }
      if (resyncShapes) {
        dispatchSyncShapes();
      }
    }
  }, [glReady, glOptions]);

  useEffect(() => {
    viewportRef.current = viewport;
    if (glReady && glRef.current !== null && viewport !== null) {
      const redrawPoints = glRef.current.pointsRenderer.setViewport(viewport);
      const redrawShapes = glRef.current.shapesRenderer.setViewport(viewport);
      if (redrawPoints || redrawShapes) {
        draw();
      }
    }
  }, [glReady, viewport]);

  useEffect(() => {
    containerSizeRef.current = containerSize;
    if (glReady && glRef.current !== null && containerSize !== null) {
      const redraw = glRef.current.context.resizeCanvas(
        glRef.current.canvas,
        containerSize,
      );
      if (redraw) {
        draw();
      }
    }
  }, [glReady, containerSize]);

  useEffect(() => {
    const abortController = new AbortController();
    if (glReady && glRef.current !== null) {
      glRef.current.pointsRenderer
        .synchronize(
          layers,
          points,
          markerMaps,
          sizeMaps,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadPoints,
          loadTable,
          { signal: abortController.signal },
        )
        .then((renderedBounds) => {
          abortController.signal.throwIfAborted();
          setGLPointsBounds(renderedBounds ?? null);
          draw();
        })
        .catch((error) => {
          if (!abortController.signal.aborted) {
            console.error("Error synchronizing WebGL points", error);
          }
        });
    }
    return () => {
      abortController.abort();
    };
  }, [
    glReady,
    layers,
    points,
    markerMaps,
    sizeMaps,
    colorMaps,
    visibilityMaps,
    opacityMaps,
    workspace,
    loadPoints,
    loadTable,
    syncPoints,
  ]);

  useEffect(() => {
    const abortController = new AbortController();
    if (glReady && glRef.current !== null) {
      glRef.current.shapesRenderer
        .synchronize(
          layers,
          shapes,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadShapes,
          loadTable,
          { signal: abortController.signal },
        )
        .then((renderedBounds) => {
          abortController.signal.throwIfAborted();
          setGLShapesBounds(renderedBounds ?? null);
          draw();
        })
        .catch((error) => {
          if (!abortController.signal.aborted) {
            console.error("Error synchronizing WebGL shapes", error);
          }
        });
    }
    return () => {
      abortController.abort();
    };
  }, [
    glReady,
    layers,
    shapes,
    colorMaps,
    visibilityMaps,
    opacityMaps,
    workspace,
    loadShapes,
    loadTable,
    syncShapes,
  ]);

  return { initGL, glRef, glReady, glPointsBounds, glShapesBounds };
}

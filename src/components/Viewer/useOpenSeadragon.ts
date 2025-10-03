import { useCallback, useEffect, useRef, useState } from "react";

import { useBoundStore } from "../../store/boundStore";
import { Rect } from "../../types";
import OpenSeadragonController from "./controllers/OpenSeadragonController";

export default function useOpenSeadragon() {
  const controllerRef = useRef<OpenSeadragonController | null>(null);

  const [viewerCanvas, setViewerCanvas] = useState<HTMLElement | null>(null);
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [viewportBounds, setViewportBounds] = useState<Rect | null>(null);

  const layerMap = useBoundStore((state) => state.layerMap);
  const imageMap = useBoundStore((state) => state.imageMap);
  const labelsMap = useBoundStore((state) => state.labelsMap);
  const projectDir = useBoundStore((state) => state.projectDir);
  const imageDataLoaderFactories = useBoundStore(
    (state) => state.imageDataLoaderFactories,
  );
  const labelsDataLoaderFactories = useBoundStore(
    (state) => state.labelsDataLoaderFactories,
  );
  const viewerOptions = useBoundStore((state) => state.viewerOptions);
  const viewerAnimationStartOptions = useBoundStore(
    (state) => state.viewerAnimationStartOptions,
  );
  const viewerAnimationFinishOptions = useBoundStore(
    (state) => state.viewerAnimationFinishOptions,
  );
  const loadImage = useBoundStore((state) => state.loadImage);
  const loadLabels = useBoundStore((state) => state.loadLabels);

  // use a ref callback for initializing the OpenSeadragon viewer
  // (note: ref callbacks are always executed before useEffect hooks)
  // https://react.dev/reference/react-dom/components/common#ref-callback
  const ref = useCallback((viewerElement: HTMLDivElement | null) => {
    if (viewerElement !== null) {
      controllerRef.current = new OpenSeadragonController(
        viewerElement,
        (newContainerSize) => setContainerSize(newContainerSize),
        (newViewportBounds) => setViewportBounds(newViewportBounds),
      );
      setViewerCanvas(controllerRef.current.getViewerCanvas());
      setContainerSize(controllerRef.current.getContainerSize());
      setViewportBounds(controllerRef.current.getViewportBounds());
    }
    return () => {
      if (controllerRef.current !== null) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
    };
  }, []);

  // set OpenSeadragon viewer options
  useEffect(() => {
    if (controllerRef.current !== null) {
      controllerRef.current.setViewerOptions(viewerOptions);
    }
  }, [viewerOptions]);

  // configure OpenSeadragon animation handlers
  useEffect(() => {
    if (controllerRef.current !== null) {
      controllerRef.current.configureAnimationHandlers(
        viewerAnimationStartOptions,
        viewerAnimationFinishOptions,
      );
    }
  }, [viewerAnimationStartOptions, viewerAnimationFinishOptions]);

  // synchronize OpenSeadragon viewer upon layer/image/labels changes
  useEffect(() => {
    const abortController = new AbortController();
    if (controllerRef.current !== null) {
      controllerRef.current
        .synchronize(
          layerMap,
          imageMap,
          labelsMap,
          loadImage,
          loadLabels,
          abortController.signal,
        )
        .catch((reason) => {
          if (!abortController.signal.aborted) {
            console.error(reason);
          }
        });
    }
    return () => {
      abortController.abort("OpenSeadragon cleanup");
    };
  }, [
    layerMap,
    imageMap,
    labelsMap,
    projectDir,
    imageDataLoaderFactories,
    labelsDataLoaderFactories,
    loadImage,
    loadLabels,
  ]);

  return { ref, viewerCanvas, containerSize, viewportBounds };
}

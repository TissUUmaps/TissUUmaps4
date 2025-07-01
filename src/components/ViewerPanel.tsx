import { useCallback, useEffect, useRef } from "react";

import { ViewerController } from "../controllers/ViewerController";
import { useBoundStore } from "../stores/boundStore";

export default function ViewerPanel() {
  const viewerRef = useRef<ViewerController | null>(null);
  const layers = useBoundStore((state) => state.layers);
  const images = useBoundStore((state) => state.images);
  const labels = useBoundStore((state) => state.labels);
  const imageData = useBoundStore((state) => state.imageData);
  const labelsData = useBoundStore((state) => state.labelsData);

  // use a ref callback for instantiating the OpenSeadragon viewer
  // https://react.dev/reference/react-dom/components/common#ref-callback
  const setViewerRef = useCallback((viewerElement: HTMLDivElement | null) => {
    const viewer = viewerRef.current;
    if (viewer) {
      viewer.destroy();
      viewerRef.current = null;
    }
    if (viewerElement) {
      viewerRef.current = new ViewerController(viewerElement);
    }
  }, []);

  // refresh the OpenSeadragon viewer upon layer/image/labels/data changes
  // (note: useEffect hooks are executed after ref callbacks)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer) {
      viewer.synchronize(layers, images, labels, imageData, labelsData);
    }
  }, [layers, images, labels, imageData, labelsData]);

  return <div ref={setViewerRef} />;
}

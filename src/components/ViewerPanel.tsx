import { useCallback, useEffect, useRef } from "react";

import { useSharedStore } from "../stores/sharedStore";
import OpenSeadragonUtils from "../utils/OpenSeadragonUtils";
import WebGLUtils from "../utils/WebGLUtils";

type ViewerState = {
  viewer: OpenSeadragon.Viewer;
  pointsCanvas: HTMLCanvasElement;
  labelsCanvas: HTMLCanvasElement;
  // tiledImageStates: TiledImageState[];
};

export default function ViewerPanel() {
  const viewerStateRef = useRef<ViewerState | null>(null);
  const layers = useSharedStore((state) => state.layers);
  const images = useSharedStore((state) => state.images);
  const labels = useSharedStore((state) => state.labels);
  const points = useSharedStore((state) => state.points);
  const shapes = useSharedStore((state) => state.shapes);

  // use a ref callback for instantiating the OpenSeadragon viewer
  // https://react.dev/reference/react-dom/components/common#ref-callback
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setViewerRef = useCallback((_viewerElement: HTMLDivElement | null) => {
    const viewerState = viewerStateRef.current;
    if (viewerState) {
      WebGLUtils.destroyPointsCanvas(viewerState.pointsCanvas);
      OpenSeadragonUtils.destroyViewer(viewerState.viewer);
      viewerStateRef.current = null;
    }
    // TODO
    // if (viewerElement) {
    //   const viewer = OpenSeadragonUtils.createViewer(viewerElement);
    //   const pointsCanvas = WebGLUtils.createPointsCanvas(viewer.drawer.canvas);
    //   const shapesCanvas = WebGLUtils.createShapesCanvas(viewer.drawer.canvas);
    //   viewerStateRef.current = {
    //     pixelsViewer: viewer,
    //     pointsCanvas: pointsCanvas,
    //     shapesCanvas: shapesCanvas,
    //     tiledImageStates: [],
    //   };
    // }
  }, []);

  // refresh the OpenSeadragon viewer upon layer/image/labels changes
  // (note: ref callbacks are executed before useEffect hooks)
  useEffect(() => {
    const viewerState = viewerStateRef.current;
    if (viewerState) {
      // TODO
      // viewerState.tiledImageStates = OpenSeadragonUtils.updateViewer(
      //   viewerState.pixelsViewer,
      //   images ?? new Map<string, ImageModel>(),
      //   labels ?? new Map<string, LabelsModel>(),
      //   layers,
      //   viewerState.tiledImageStates,
      // );
    }
  }, [layers, images, labels]);

  // refresh the WebGL points canvas upon layer/points changes
  // (note: ref callbacks are executed before useEffect hooks)
  useEffect(() => {
    const viewerState = viewerStateRef.current;
    if (viewerState) {
      // TODO
    }
  }, [layers, points]);

  // refresh the WebGL shapes canvas upon layer/shapes changes
  // (note: ref callbacks are executed before useEffect hooks)
  useEffect(() => {
    const viewerState = viewerStateRef.current;
    if (viewerState) {
      // TODO
    }
  }, [layers, shapes]);

  return <div ref={setViewerRef} />;
}

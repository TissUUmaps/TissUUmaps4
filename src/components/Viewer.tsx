import OpenSeadragon from "openseadragon";
import { useCallback, useEffect, useRef } from "react";

import { ImageModel } from "../models/image";
import { useSharedStore } from "../stores/sharedStore";
import OpenSeadragonUtils, {
  TiledImageState,
} from "../utils/OpenSeadragonUtils";
import WebGLUtils from "../utils/WebGLUtils";

type ViewerState = {
  viewer: OpenSeadragon.Viewer;
  pointsCanvas: HTMLCanvasElement;
  tiledImageStates: TiledImageState[];
};

export default function Viewer() {
  const viewerStateRef = useRef<ViewerState | null>(null);
  const layers = useSharedStore((state) => state.layers);
  const images = useSharedStore((state) => state.images);
  const points = useSharedStore((state) => state.points);
  const createImageDataSource = useSharedStore(
    (state) => state.createImageDataSource,
  );

  // use a ref callback for instantiating the OpenSeadragon viewer
  // https://react.dev/reference/react-dom/components/common#ref-callback
  const setViewerRef = useCallback((viewerElement: HTMLDivElement | null) => {
    const viewerState = viewerStateRef.current;
    if (viewerState) {
      WebGLUtils.destroyPointsCanvas(viewerState.pointsCanvas);
      OpenSeadragonUtils.destroyViewer(viewerState.viewer);
      viewerStateRef.current = null;
    }
    if (viewerElement) {
      const viewer = OpenSeadragonUtils.createViewer(viewerElement);
      const pointsCanvas = WebGLUtils.createPointsCanvas(viewer.drawer.canvas);
      viewerStateRef.current = {
        viewer: viewer,
        pointsCanvas: pointsCanvas,
        tiledImageStates: [],
      };
    }
  }, []);

  // refresh the OpenSeadragon viewer upon layer/image changes
  // (note: ref callbacks are executed before useEffect hooks)
  useEffect(() => {
    const viewerState = viewerStateRef.current;
    if (viewerState) {
      viewerState.tiledImageStates = OpenSeadragonUtils.updateViewer(
        viewerState.viewer,
        images ?? new Map<string, ImageModel>(),
        layers,
        viewerState.tiledImageStates,
        createImageDataSource,
      );
    }
  }, [layers, images, createImageDataSource]);

  // refresh the WebGL points canvas upon layer/points changes
  // (note: ref callbacks are executed before useEffect hooks)
  useEffect(() => {
    const viewerState = viewerStateRef.current;
    if (viewerState) {
      // TODO
    }
  }, [layers, points]);

  // TODO global marker size slider
  // <div id="ISS_globalmarkersize" className="d-none px-1 mx-1 viewer-layer">
  //   <label className="form-label" htmlFor="ISS_globalmarkersize_text">
  //     Marker size:
  //     <em className="form-label" id="ISS_globalmarkersize_label">
  //       100
  //     </em>
  //   </label>
  //   <br />
  //   <input
  //     className="form-range"
  //     type="range"
  //     id="ISS_globalmarkersize_text"
  //     defaultValue="100"
  //     min="0"
  //     max="500"
  //     step="10"
  //     oninput="document.getElementById('ISS_globalmarkersize_label').innerHTML = this.value;"
  //   />
  // </div>

  return <div ref={setViewerRef} className="h-100" />;
}

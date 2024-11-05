import OpenSeadragon from "openseadragon";
import { useCallback, useEffect, useRef } from "react";

import useSharedStore from "../store/sharedStore";
import OpenSeadragonUtils, {
  TiledImageInfo,
} from "../utils/OpenSeadragonUtils";
import WebGLUtils from "../utils/WebGLUtils";

type ViewerState = {
  viewer: OpenSeadragon.Viewer;
  pointsOverlay: HTMLCanvasElement;
  tiledImageInfos: TiledImageInfo[];
};

export default function Viewer() {
  const viewerStateRef = useRef<ViewerState | null>(null);
  const layers = useSharedStore((state) => state.layers);
  const images = useSharedStore((state) => state.images);
  const points = useSharedStore((state) => state.points);
  const createImageReader = useSharedStore((state) => state.createImageReader);

  // use a ref callback for instantiating the OpenSeadragon viewer
  // https://react.dev/reference/react-dom/components/common#ref-callback
  const setViewerRef = useCallback((viewerElement: HTMLDivElement | null) => {
    const viewerState = viewerStateRef.current;
    if (viewerState) {
      WebGLUtils.destroyPointsOverlay(viewerState.pointsOverlay);
      OpenSeadragonUtils.destroyViewer(viewerState.viewer);
      viewerStateRef.current = null;
    }
    if (viewerElement) {
      const viewer = OpenSeadragonUtils.createViewer(viewerElement);
      const pointsOverlay = WebGLUtils.createPointsOverlay(
        viewer.drawer.canvas,
      );
      viewerStateRef.current = {
        viewer: viewer,
        pointsOverlay: pointsOverlay,
        tiledImageInfos: [],
      };
    }
  }, []);

  // refresh the OpenSeadragon viewer upon layer/image changes
  // (note: ref callbacks are executed before useEffect hooks)
  useEffect(() => {
    const viewerState = viewerStateRef.current;
    if (viewerState) {
      viewerState.tiledImageInfos = OpenSeadragonUtils.updateViewer(
        viewerState.viewer,
        viewerState.tiledImageInfos,
        layers,
        images,
        createImageReader,
      );
    }
  }, [layers, images, createImageReader]);

  // refresh the WebGL points overlay upon layer/points changes
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

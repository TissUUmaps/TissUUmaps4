import OpenSeadragon from "openseadragon";
import { useCallback, useEffect, useRef } from "react";

import useSharedStore from "../store/sharedStore";
import OpenSeadragonUtils from "../utils/OpenSeadragonUtils";

export default function Viewer() {
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const viewerState = useSharedStore((state) => state.viewerState);
  const setViewerState = useSharedStore((state) => state.setViewerState);
  const layers = useSharedStore((state) => state.layers);

  // callback refs are called before useEffect, so we can use one to create the viewer
  const setViewerRef = useCallback((viewerElement: HTMLDivElement | null) => {
    if (viewerRef.current) {
      OpenSeadragonUtils.destroyViewer(viewerRef.current);
      viewerRef.current = null;
    }
    if (viewerElement) {
      viewerRef.current = OpenSeadragonUtils.createViewer(viewerElement);
    }
  }, []);

  // asynchronously update the viewer upon changes in the desired viewer state
  useEffect(() => {
    if (viewerRef.current) {
      const newViewerState = OpenSeadragonUtils.updateViewer(
        viewerRef.current,
        viewerState,
        layers,
      );
      setViewerState(newViewerState);
    }
  }, [viewerState, layers, setViewerState]);

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

  return <div ref={setViewerRef} id="viewer" />; // className="h-100"
}

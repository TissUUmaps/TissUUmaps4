import OpenSeadragon from "openseadragon";
import { useCallback, useEffect, useRef } from "react";

import Layer from "../model/layer";
import useProjectStore from "../stores/projectStore";
import OpenSeadragonUtils from "../utils/OpenSeadragonUtils";

export default function ViewerPanel() {
  const layers = useProjectStore((state) => state.layers);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const viewerLayersRef = useRef<Layer[]>([]);

  // callback refs are called before useEffect, so we can use one to create the viewer
  const setViewerRef = useCallback((viewerElement: HTMLDivElement | null) => {
    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
      viewerLayersRef.current = [];
    }
    if (viewerElement) {
      viewerRef.current = OpenSeadragonUtils.createViewer(viewerElement);
      viewerLayersRef.current = [];
    }
  }, []);

  // update the viewer when the layers change
  useEffect(() => {
    if (viewerRef.current) {
      const oldLayers = [...viewerLayersRef.current];
      OpenSeadragonUtils.updateLayers(viewerRef.current, oldLayers, layers);
      viewerLayersRef.current = [...layers];
    }
  }, [layers]);

  return (
    <div className="col px-0 position-relative" id="ISS_viewer_container">
      <a
        id="floating-navbar-toggler"
        className="hook in floating-menu-btn shadow navbar-dark p-2 d-none"
        data-bs-toggle="collapse"
        data-bs-target="#main-navbar"
        role="button"
        aria-expanded="false"
        aria-controls="main-navbar"
        href="#"
      >
        <span className="navbar-toggler-icon"></span>
      </a>
      {/* The id is what OSD will look for to draw the viewer, the class is our own css to stylize
          The ID will give the prefix for all the objects related to the viewer in this case ISS */}
      <div
        ref={setViewerRef}
        id="ISS_viewer"
        className="ISS_viewer h-100"
      ></div>
      {/* Global marker size slider */}
      <div id="ISS_globalmarkersize" className="d-none px-1 mx-1 viewer-layer">
        <label className="form-label" htmlFor="ISS_globalmarkersize_text">
          Marker size:
          <em className="form-label" id="ISS_globalmarkersize_label">
            100
          </em>
        </label>
        <br />
        <input
          className="form-range"
          type="range"
          id="ISS_globalmarkersize_text"
          defaultValue="100"
          min="0"
          max="500"
          step="10"
          // TODO oninput="document.getElementById('ISS_globalmarkersize_label').innerHTML = this.value;"
        />
      </div>
    </div>
  );
}

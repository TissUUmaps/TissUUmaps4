import OpenSeadragon from "openseadragon";
import { useEffect } from "react";

export default function ViewerPanel() {
  useEffect(() => {
    let viewer: OpenSeadragon.Viewer | null = OpenSeadragon({
      id: "ISS_viewer",
      prefixUrl: "js/openseadragon/images/", // TODO OpenSeadragon prefixUrl
      navigatorSizeRatio: 0.15,
      wrapHorizontal: false,
      showNavigator: true,
      navigatorPosition: "BOTTOM_LEFT",
      animationTime: 0.0,
      blendTime: 0,
      minZoomImageRatio: 0.9,
      maxZoomPixelRatio: 30,
      immediateRender: false,
      zoomPerClick: 1.0,
      constrainDuringPan: true,
      visibilityRatio: 0.5,
      showNavigationControl: false,
      maxImageCacheCount: 2000,
      imageSmoothingEnabled: false,
      preserveImageSizeOnResize: true,
      imageLoaderLimit: 50,
      gestureSettingsUnknown: {
        flickEnabled: false,
      },
      gestureSettingsTouch: {
        flickEnabled: false,
      },
      gestureSettingsPen: {
        flickEnabled: false,
      },
      // debouncePanEvents: false,
    });

    return () => {
      viewer!.destroy();
      viewer = null;
    };
  }, []);

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
      <div id="ISS_viewer" className="ISS_viewer h-100"></div>
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

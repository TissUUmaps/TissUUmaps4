export default function ViewerPanel() {
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

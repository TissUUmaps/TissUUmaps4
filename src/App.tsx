import logo from "./assets/logo_40.png";

import "./App.css";

function App() {
  return (
    <div
      id="main-ui"
      className="container-fluid px-0 d-flex flex-column vh-100 overflow-hidden"
    >
      <nav
        id="main-navbar"
        className="navbar navbar-expand-lg navbar-light border-bottom border-dark flex-shrink-0" // TODO  {% if isStandalone %}d-none{% endif %}
      >
        <div className="container-fluid">
          <a
            className="navbar-brand pt-0"
            target="_blank"
            rel="noreferrer"
            href="https://tissuumaps.github.io/"
          >
            <img
              src={logo}
              width="25"
              height="27"
              alt="TissUUmaps Logotype"
              title="TissUUmaps"
            />
            <span className="ms-2 pt-2 small">TissUUmaps</span>
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbar-menu"
            aria-controls="navbar-menu"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbar-menu">
            <ul className="navbar-nav">
              <li className="nav-item dropdown">
                <a
                  className="nav-link dropdown-toggle active"
                  href="#"
                  id="navbarDropdownMenuLink"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  File
                </a>
                <ul
                  className="dropdown-menu"
                  id="menubar_File"
                  aria-labelledby="navbarDropdownMenuLink"
                >
                  <li>
                    <a className="dropdown-item" href="#" id="capture_viewport">
                      <span>Capture viewport</span>
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" href="#" id="see_version">
                      <span>TissUUmaps version</span>
                    </a>
                  </li>
                </ul>
              </li>
              <li className="nav-item" id="nav-item-title">
                <a
                  className="nav-link active"
                  aria-current="page"
                  id="project_title_top"
                  href="#"
                ></a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="row mx-0 flex-grow-1 overflow-hidden">
        {/* Row for viewer */}
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
          <div
            id="ISS_globalmarkersize"
            className="d-none px-1 mx-1 viewer-layer"
          >
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

        <div
          id="ISS_menu"
          className="ISS_menu col-xl-4 col-lg-5 col-md-6 col-sm-8 col-xs-12 mh-100 overflow-auto"
        >
          {/* TODO
          {% if projectList %}
          <div className="row pb-2 p-2">
            <div className="card border-primary p5">
              <div className="card-body">
                <h5 className="card-title d-none" id="project_title"></h5>
                <p className="card-text d-none" id="project_description"></p>
                {% if projectList|length > 1 or not(projectList.0.selected) %}
                <strong>Select dataset to display:</strong>
                <br />
                <select className="form-select" id="project_select">
                  {% for project in projectList %}
                  <option
                    value="{{project.path}}"
                    {%
                    if
                    project.selected
                    %}selected{%
                    endif
                    %}
                  >
                    {{project.name}}
                  </option>
                  {% endfor %}
                </select>
                {% endif %}
              </div>
            </div>
          </div>
          {% endif %} */}
          <div className="row pb-2">
            {/* Level 0 tabs */}
            <ul id="main-tabs-menu" className="nav nav-tabs pt-1 sticky-top">
              <li className="nav-item">
                <button
                  data-bs-target="#markers-iss-gui"
                  data-bs-toggle="tab"
                  aria-expanded="true"
                  className="nav-link active"
                  id="title-tab-markers"
                >
                  Markers
                </button>
              </li>
              <li>
                <button
                  data-bs-target="#markers-regions-gui"
                  data-bs-toggle="tab"
                  aria-expanded="false"
                  className="nav-link"
                  id="title-tab-regions"
                >
                  Regions
                </button>
              </li>
              <li>
                <button
                  data-bs-target="#image-gui"
                  data-bs-toggle="tab"
                  aria-expanded="false"
                  className="nav-link"
                  id="title-tab-image"
                >
                  Layers
                </button>
              </li>
              <li>
                <button
                  data-bs-target="#project-gui"
                  data-bs-toggle="tab"
                  aria-expanded="false"
                  className="nav-link"
                  id="title-tab-project"
                >
                  <u className="bi bi-gear-fill"></u>
                </button>
              </li>
              <li>
                <button
                  data-bs-target="#plugins-gui"
                  data-bs-toggle="tab"
                  aria-expanded="false"
                  className="nav-link d-none"
                  id="title-tab-plugins"
                >
                  Plugins
                </button>
              </li>
            </ul>

            <div id="TM-tabs" className="tab-content">
              {/* TAB 1.1 ISS data  -------------------------------------------------------------------------------- */}
              <div className="tab-pane active" id="markers-iss-gui">
                <div className="panel panel-default">
                  <div className="panel-body">
                    <div className="row" id="divMarkersDownloadButtons"></div>
                    {/* 1.1 Row nav tabs */}
                    <ul
                      className="nav nav-tabs mt-2"
                      id="level-1-tabs"
                      role="tablist"
                    >
                      <li className="nav-item" id="plus-1" role="presentation">
                        <button
                          className="nav-link"
                          id="plus-1-button"
                          data-bs-toggle="tab"
                          data-bs-target="#"
                          type="button"
                          role="tab"
                          aria-controls="plus"
                          aria-selected="false"
                        >
                          <strong>+</strong>
                        </button>
                      </li>
                    </ul>
                    <div className="tab-content" id="level-1-tabsContent"></div>
                  </div>
                </div>
              </div>
              {/* TAB 1.2 Region data ----------------------------------------------------------------------------- */}
              <div className="tab-pane" id="markers-regions-gui">
                <div className="panel panel-default">
                  <div className="panel-body">
                    <div className="row">
                      {/* Tabs 1.3.0 region subtabs */}
                      <ul className="nav nav-tabs mt-2">
                        <li className="nav-item">
                          <button
                            className="nav-link active"
                            data-bs-target="#markers-regions-project-gui"
                            data-bs-toggle="tab"
                            aria-expanded="true"
                          >
                            Regions
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            className="nav-link"
                            data-bs-target="#markers-regions-import-gui"
                            data-bs-toggle="tab"
                            aria-expanded="false"
                          >
                            Import
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            className="nav-link"
                            data-bs-target="#markers-regions-export-gui"
                            data-bs-toggle="tab"
                            aria-expanded="false"
                          >
                            Export
                          </button>
                        </li>
                      </ul>
                      <div id="markers-region-subtabs" className="tab-content">
                        {/* Tabs 1.3.1 */}
                        <div
                          className="tab-pane show active"
                          id="markers-regions-project-gui"
                        >
                          <div className="panel panel-default">
                            <div className="panel-body">
                              <div id="divRegionsDownloadButtons"></div>
                              <div id="regionAccordions"></div>

                              <div id="markers-regions-div">
                                <div
                                  className="my-1"
                                  id="markers-regions-panel"
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Tabs 1.3.2 */}
                        <div
                          className="tab-pane"
                          id="markers-regions-import-gui"
                        >
                          <div className="panel panel-default">
                            <div className="panel-body">
                              <div className="row">
                                <div className="col-9">
                                  <input
                                    className="form-control-file form-control"
                                    type="file"
                                    id="ISS_region_files_import"
                                    name="files[]"
                                  />
                                </div>
                                <div className="col-3">
                                  <button
                                    id="ISS_import_regions"
                                    className="btn btn-primary"
                                    type="button"
                                  >
                                    Import
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Tabs 1.3.3 */}
                        <div
                          className="tab-pane"
                          id="markers-regions-export-gui"
                        >
                          <div className="panel panel-default">
                            <div className="panel-body">
                              <label htmlFor="ISS_region_file_name">
                                Download regions for later use
                              </label>
                              <div className="row">
                                <div className="col-9">
                                  <input
                                    className="form-control"
                                    type="text"
                                    id="ISS_region_file_name"
                                    placeholder="regions.json"
                                    defaultValue="regions.json"
                                  />
                                </div>
                                <div className="col-3">
                                  <button
                                    id="ISS_export_regions"
                                    className="btn btn-primary"
                                    type="button"
                                  >
                                    Export
                                  </button>
                                </div>
                              </div>
                              <label htmlFor="ISS_region_csv_name">
                                Download expression in regions
                              </label>
                              <div className="row">
                                <div className="col-9">
                                  <input
                                    className="form-control"
                                    type="text"
                                    id="ISS_region_csv_name"
                                    placeholder="regions.csv"
                                    defaultValue="regions.csv"
                                  />
                                </div>
                                <div className="col-3">
                                  <button
                                    id="ISS_export_regions_csv"
                                    className="btn btn-primary"
                                    type="button"
                                  >
                                    Export
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* TAB 1.3 Overlay data ----------------------------------------------------------------------------- */}
              <div className="tab-pane" id="image-gui">
                <div className="panel panel-default">
                  <div className="panel-body">
                    <div
                      className="row overflow-auto mb-2"
                      id="image-overlay-panel"
                    ></div>
                    <div id="filterSettingsAccordions">
                      <div className="accordion-item">
                        <h2
                          className="accordion-header"
                          id="filterSettingsHeaders"
                        >
                          <button
                            type="button"
                            className="accordion-button collapsed"
                            data-bs-toggle="collapse"
                            data-bs-target="#filterSettings"
                            aria-expanded="false"
                            aria-controls="filterSettings"
                          >
                            <i className="bi bi-gear-fill"></i>&nbsp;Filter
                            settings
                          </button>
                        </h2>
                        <div
                          className="accordion-collapse p-2 collapse"
                          id="filterSettings"
                          aria-labelledby="filterSettingsHeaders"
                          data-bs-parent="#filterSettingsAccordions"
                        >
                          <div
                            className="col-12 px-1"
                            id="filterSettings"
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* end of a main panel */}
              </div>
              {/* end of image-gui */}
              {/* TAB 1.4 Plugin data ----------------------------------------------------------------------------- */}
              <div className="tab-pane" id="plugins-gui">
                <div className="panel panel-default">
                  <div className="panel-body">
                    <h6 className="my-2">List of plugins:</h6>
                    <div id="pluginsAccordions"></div>
                  </div>
                </div>
                {/* end of a main panel */}
              </div>
              {/* TAB 1.5 Project data ----------------------------------------------------------------------------- */}
              <div className="tab-pane" id="project-gui">
                <div className="panel panel-default">
                  <div className="panel-body">
                    <h6 className="my-2">Project title:</h6>
                    <div className="row">
                      <div className="col-12">
                        <input
                          className="form-control tmap_project_param_input"
                          type="text"
                          id="project_title_input"
                          placeholder="Project title"
                          data-param="filename"
                          data-type="str"
                        />
                      </div>
                    </div>
                    <h6 className="my-2">Project description (html):</h6>
                    <div className="row">
                      <div className="col-12">
                        <textarea
                          className="form-control tmap_project_param_input"
                          id="project_description_input"
                          rows={3}
                          placeholder="Project description"
                          data-param="description"
                          data-type="str"
                        ></textarea>
                      </div>
                    </div>
                    {/* List of plugins used in the project */}
                    <h6 className="my-2">List of plugins:</h6>
                    <div className="row">
                      <div className="col-12">
                        <input
                          className="form-control tmap_project_param_input"
                          type="text"
                          id="project_plugins_input"
                          placeholder="Plugin1, Plugin2, ..."
                          data-param="plugins"
                          data-type="list"
                        />
                      </div>
                    </div>
                    {/* List of plugins used in the project */}
                    <h6 className="my-2">Scalebar pixel resolution (mpp):</h6>
                    <div className="row">
                      <div className="col-12">
                        <input
                          className="form-control tmap_project_param_input"
                          type="text"
                          id="project_mpp_input"
                          placeholder="0"
                          data-param="mpp"
                          data-type="number"
                        />
                      </div>
                    </div>
                    {/* Starting Viewport Bounding Box, as x, y, width, and height floats */}
                    <h6 className="my-2">Starting viewport:</h6>
                    <div className="row">
                      <div className="col-2">
                        <div className="row">
                          <label
                            className="col-4"
                            htmlFor="project_boundingBox_x"
                          >
                            X:
                          </label>
                          <input
                            className="col-8 form-control tmap_project_param_input"
                            type="text"
                            id="project_boundingBox_x"
                            placeholder="0"
                            data-param="boundingBox.x"
                            data-type="number"
                          />
                        </div>
                      </div>
                      <div className="col-2">
                        <div className="row">
                          <label
                            className="col-4"
                            htmlFor="project_boundingBox_y"
                          >
                            Y:
                          </label>
                          <input
                            className="col-8 form-control tmap_project_param_input"
                            type="text"
                            id="project_boundingBox_y"
                            placeholder="0"
                            data-param="boundingBox.y"
                            data-type="number"
                          />
                        </div>
                      </div>
                      <div className="col-2">
                        <div className="row">
                          <label
                            className="col-4"
                            htmlFor="project_boundingBox_width"
                          >
                            W:
                          </label>
                          <input
                            className="col-8 form-control tmap_project_param_input"
                            type="text"
                            id="project_boundingBox_width"
                            placeholder="0"
                            data-param="boundingBox.width"
                            data-type="number"
                          />
                        </div>
                      </div>
                      <div className="col-2">
                        <div className="row">
                          <label
                            className="col-4"
                            htmlFor="project_boundingBox_height"
                          >
                            H:
                          </label>
                          <input
                            className="col-8 form-control tmap_project_param_input"
                            type="text"
                            id="project_boundingBox_height"
                            placeholder="0"
                            data-param="boundingBox.height"
                            data-type="number"
                          />
                        </div>
                      </div>
                      <div className="col-4">
                        {/* Add button to use actual boundingBox */}
                        <button
                          id="project_boundingBox_actual"
                          className="w-100 btn btn-primary"
                          type="button"
                        >
                          Use actual viewport
                        </button>
                      </div>
                    </div>
                    {/* Import and export tmap project button, with ids load_project_menu and save_project_menu */}
                    <div className="row mt-2">
                      <div className="col-6">
                        <button
                          id="load_project_menu"
                          className="btn btn-primary w-100"
                          type="button"
                        >
                          Import project
                        </button>
                      </div>
                      <div className="col-6">
                        <button
                          id="save_project_menu"
                          className="btn btn-primary w-100"
                          type="button"
                        >
                          Export project
                        </button>
                      </div>
                    </div>
                    <div className="row mt-2">
                      <div className="col-6">
                        <button
                          id="edit_project_json"
                          className="btn btn-primary w-100"
                          type="button"
                        >
                          Edit tmap JSON
                        </button>
                      </div>
                      <div className="col-6">
                        <button
                          id="download_all_files"
                          className="btn btn-primary w-100"
                          type="button"
                        >
                          Download project archive (.tar)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* end of a main panel */}
              </div>
              {/* end of Plugin-gui */}
            </div>
            {/* end of TM-tabs */}
          </div>
          {/* end of Level 0 tabs */}
        </div>
        {/* end of lateral panel */}

        <div
          id="ISS_collapser"
          className="d-flex align-self-center justify-content-end px-0 position-absolute"
        >
          <div className="btn btn-primary" id="ISS_collapse_btn">
            <i className="bi bi-caret-right-fill"></i>
          </div>
        </div>
      </div>
      {/* end of single row */}
    </div>
  );
}

export default App;

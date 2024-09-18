// TODO implement ShapesPanel
export default function ShapesPanel() {
  return (
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
                    <div className="my-1" id="markers-regions-panel"></div>
                  </div>
                </div>
              </div>
            </div>
            {/* Tabs 1.3.2 */}
            <div className="tab-pane" id="markers-regions-import-gui">
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
            <div className="tab-pane" id="markers-regions-export-gui">
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
  );
}

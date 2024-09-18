// TODO implement ProjectPanel
export default function ProjectPanel() {
  return (
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
              <label className="col-4" htmlFor="project_boundingBox_x">
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
              <label className="col-4" htmlFor="project_boundingBox_y">
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
              <label className="col-4" htmlFor="project_boundingBox_width">
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
              <label className="col-4" htmlFor="project_boundingBox_height">
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
  );
}

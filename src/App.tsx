import { useEffect } from "react";

import "./App.css";
import Menu from "./components/Menu";
import Viewer from "./components/Viewer";
import LayersPanel from "./components/layers/LayersPanel";
import PointsPanel from "./components/points/PointsPanel";
import ProjectPanel from "./components/project/ProjectPanel";
import ShapesPanel from "./components/shapes/ShapesPanel";
import TileSourceImageReader, {
  TILE_SOURCE_IMAGE_READER_TYPE,
  TileSourceImageReaderOptions,
} from "./readers/TileSourceImageReader";
import useSharedStore from "./store/sharedStore";

export default function App() {
  const initialized = useSharedStore((state) => state.initialized);
  const setInitialized = useSharedStore((state) => state.setInitialized);
  const registerImageReader = useSharedStore(
    (state) => state.registerImageReader,
  );
  const registerPointsReader = useSharedStore(
    (state) => state.registerPointsReader,
  );
  const registerShapesReader = useSharedStore(
    (state) => state.registerShapesReader,
  );
  const unregisterImageReader = useSharedStore(
    (state) => state.unregisterImageReader,
  );
  const unregisterPointsReader = useSharedStore(
    (state) => state.unregisterPointsReader,
  );
  const unregisterShapesReader = useSharedStore(
    (state) => state.unregisterShapesReader,
  );

  useEffect(() => {
    registerImageReader(
      TILE_SOURCE_IMAGE_READER_TYPE,
      (options) =>
        new TileSourceImageReader(options as TileSourceImageReaderOptions),
    );
    setInitialized(true);
    return () => {
      setInitialized(false);
      unregisterImageReader(TILE_SOURCE_IMAGE_READER_TYPE);
    };
  }, [
    setInitialized,
    registerImageReader,
    unregisterImageReader,
    registerPointsReader,
    unregisterPointsReader,
    registerShapesReader,
    unregisterShapesReader,
  ]);

  if (!initialized) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width: "100vw", height: "100vh" }}
      >
        <p>Initializing...</p>
      </div>
    );
  }

  return (
    <div
      id="main-ui"
      className="container-fluid px-0 d-flex flex-column vh-100 overflow-hidden"
    >
      <Menu />

      <div className="row mx-0 flex-grow-1 overflow-hidden">
        <div className="col px-0 position-relative">
          <Viewer />
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
            <ul id="main-tabs-menu" className="nav nav-tabs pt-1 sticky-top">
              <li className="nav-item">
                <button
                  data-bs-target="#project-gui"
                  data-bs-toggle="tab"
                  aria-expanded="true"
                  className="nav-link active"
                  id="title-tab-project"
                >
                  Project
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
              <li className="nav-item">
                <button
                  data-bs-target="#markers-iss-gui"
                  data-bs-toggle="tab"
                  aria-expanded="false"
                  className="nav-link"
                  id="title-tab-markers"
                >
                  Points
                </button>
              </li>
              <li className="nav-item">
                <button
                  data-bs-target="#markers-regions-gui"
                  data-bs-toggle="tab"
                  aria-expanded="false"
                  className="nav-link"
                  id="title-tab-regions"
                >
                  Shapes
                </button>
              </li>
              {/* TODO plugins panel
              <li className="nav-item">
                <button
                  data-bs-target="#plugins-gui"
                  data-bs-toggle="tab"
                  aria-expanded="false"
                  className="nav-link d-none"
                  id="title-tab-plugins"
                >
                  Plugins
                </button>
              </li> */}
            </ul>
            <div id="TM-tabs" className="tab-content">
              <div className="tab-pane active" id="project-gui">
                <ProjectPanel />
              </div>
              <div className="tab-pane" id="image-gui">
                <LayersPanel />
              </div>
              <div className="tab-pane" id="markers-iss-gui">
                <PointsPanel />
              </div>
              <div className="tab-pane" id="markers-regions-gui">
                <ShapesPanel />
              </div>
              {/* TODO plugins panel
              <div className="tab-pane" id="plugins-gui">
                <div className="panel panel-default">
                  <div className="panel-body">
                    <h6 className="my-2">List of plugins:</h6>
                    <div id="pluginsAccordions"></div>
                  </div>
                </div>
              </div> */}
            </div>
          </div>
        </div>

        {/* TODO collapser <div
          id="ISS_collapser"
          className="d-flex align-self-center justify-content-end px-0 position-absolute"
        >
          <div className="btn btn-primary" id="ISS_collapse_btn">
            <i className="bi bi-caret-right-fill"></i>
          </div>
        </div> */}
      </div>
    </div>
  );
}

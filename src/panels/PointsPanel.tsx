export default function PointsPanel() {
  return (
    <div className="panel panel-default">
      <div className="panel-body">
        <div className="row" id="divMarkersDownloadButtons"></div>
        <ul className="nav nav-tabs mt-2" id="level-1-tabs" role="tablist">
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
  );
}

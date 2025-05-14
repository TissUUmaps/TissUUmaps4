// TODO implement LayersCollectionPanel
export default function LayersCollectionPanel() {
  return (
    <div className="panel panel-default">
      <div className="panel-body">
        <div className="row overflow-auto mb-2" id="image-overlay-panel"></div>
        <div id="filterSettingsAccordions">
          <div className="accordion-item">
            <h2 className="accordion-header" id="filterSettingsHeaders">
              <button
                type="button"
                className="accordion-button collapsed"
                data-bs-toggle="collapse"
                data-bs-target="#filterSettings"
                aria-expanded="false"
                aria-controls="filterSettings"
              >
                <i className="bi bi-gear-fill"></i>&nbsp;Filter settings
              </button>
            </h2>
            <div
              className="accordion-collapse p-2 collapse"
              id="filterSettings"
              aria-labelledby="filterSettingsHeaders"
              data-bs-parent="#filterSettingsAccordions"
            >
              <div className="col-12 px-1" id="filterSettings"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

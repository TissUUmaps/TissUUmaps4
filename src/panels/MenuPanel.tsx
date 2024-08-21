import logo from "../assets/logo_40.png";

export default function MenuPanel() {
  return (
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
  );
}

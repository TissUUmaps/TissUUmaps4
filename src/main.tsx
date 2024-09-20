import "bootstrap/dist/js/bootstrap.bundle.js";
import { enableGeoTIFFTileSource } from "geotiff-tilesource";
import { enableMapSet } from "immer";
import OpenSeadragon from "openseadragon";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "./bootstrap.scss";
import "./index.css";

// enable Map/Set support for immer
enableMapSet();

// enable GeoTIFFTileSource support for OpenSeadragon
enableGeoTIFFTileSource(OpenSeadragon);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

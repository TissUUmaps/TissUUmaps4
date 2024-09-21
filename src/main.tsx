import "bootstrap/dist/js/bootstrap.bundle.js";
import { enableMapSet } from "immer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import "./bootstrap.scss";
import "./index.css";

// enable Map/Set support for immer
enableMapSet();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

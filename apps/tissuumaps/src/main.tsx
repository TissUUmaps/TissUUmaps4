import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.tsx";
import { bootstrap } from "./bootstrap.ts";
import "./index.css";

const teardown = bootstrap();
import.meta.hot?.dispose(teardown);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

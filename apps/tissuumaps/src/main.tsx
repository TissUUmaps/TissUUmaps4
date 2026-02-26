import { enableMapSet } from "immer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.tsx";
import { AlertDialogProvider } from "./components/common/alert-dialog-provider.tsx";
import "./index.css";

// enable Map/Set support for immer
enableMapSet();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AlertDialogProvider>
      <App />
    </AlertDialogProvider>
  </StrictMode>,
);

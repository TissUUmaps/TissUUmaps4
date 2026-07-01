import { createContext, useContext } from "react";

import type { OpenSeadragonController } from "@tissuumaps/core";

export const OpenSeadragonControllerContext =
  createContext<OpenSeadragonController | null>(null);

export function useOpenSeadragonController(): OpenSeadragonController | null {
  return useContext(OpenSeadragonControllerContext);
}

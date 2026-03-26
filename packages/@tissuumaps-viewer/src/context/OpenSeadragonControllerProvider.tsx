import { type ReactNode } from "react";

import { type OpenSeadragonController } from "@tissuumaps/core";

import { OpenSeadragonControllerContext } from "./OpenSeadragonControllerContext";

export type OpenSeadragonControllerProviderProps = {
  controller: OpenSeadragonController | null;
  children: ReactNode;
};

export function OpenSeadragonControllerProvider({
  controller,
  children,
}: OpenSeadragonControllerProviderProps) {
  return (
    <OpenSeadragonControllerContext.Provider value={controller}>
      {children}
    </OpenSeadragonControllerContext.Provider>
  );
}

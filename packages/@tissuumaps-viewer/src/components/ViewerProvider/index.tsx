import { type ReactNode } from "react";

import { type ViewerAdapter, ViewerContext } from "../../context";

export type ViewerProviderProps = {
  adapter: ViewerAdapter;
  children: ReactNode;
};

export function ViewerProvider({ adapter, children }: ViewerProviderProps) {
  return (
    <ViewerContext.Provider value={adapter}>{children}</ViewerContext.Provider>
  );
}

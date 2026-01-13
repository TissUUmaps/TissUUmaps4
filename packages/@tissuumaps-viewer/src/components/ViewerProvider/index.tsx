import { type ReactNode } from "react";

import { type ViewerAdapter, ViewerContext } from "../../context";

export function ViewerProvider({
  adapter,
  children,
}: {
  adapter: ViewerAdapter;
  children: ReactNode;
}) {
  return (
    <ViewerContext.Provider value={adapter}>{children}</ViewerContext.Provider>
  );
}

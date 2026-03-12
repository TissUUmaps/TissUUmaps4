import { useEffect } from "react";

import { useTissUUmaps } from "../store";

declare global {
  interface Window {
    TissUUmaps?: typeof useTissUUmaps;
  }
}

export function usePlugins() {
  useEffect(() => {
    window.TissUUmaps = useTissUUmaps;
    return () => {
      delete window.TissUUmaps;
    };
  }, []);
}

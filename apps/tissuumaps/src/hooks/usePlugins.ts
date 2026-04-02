import { useEffect } from "react";

import { useTissUUmaps } from "@/store";

type Plugin = {
  name: string;
  setup: (store: typeof useTissUUmaps) => (() => void) | undefined;
};

declare global {
  interface Window {
    TissUUmapsPlugins?: Plugin[];
  }
}

export function usePlugins() {
  useEffect(() => {
    window.TissUUmapsPlugins ??= [];
    const plugins = window.TissUUmapsPlugins;
    const cleanups: ((() => void) | undefined)[] = [];
    for (const plugin of plugins) {
      let cleanup;
      try {
        cleanup = plugin.setup(useTissUUmaps);
      } catch (error) {
        console.error(`Error setting up plugin "${plugin.name}":`, error);
      }
      cleanups.push(cleanup);
    }
    plugins.push = (...newPlugins: Plugin[]) => {
      Array.prototype.push.call(plugins, ...newPlugins);
      for (const newPlugin of newPlugins) {
        let newCleanup;
        try {
          newCleanup = newPlugin.setup(useTissUUmaps);
        } catch (error) {
          console.error(`Error setting up plugin "${newPlugin.name}":`, error);
        }
        cleanups.push(newCleanup);
      }
      return plugins.length;
    };
    return () => {
      plugins.push = Array.prototype.push;
      for (let i = 0; i < plugins.length; i++) {
        const cleanup = cleanups[i];
        if (cleanup !== undefined) {
          try {
            cleanup();
          } catch (error) {
            const plugin = plugins[i]!;
            console.error(`Error cleaning up plugin "${plugin.name}":`, error);
          }
        }
      }
    };
  }, []);
}

import { useEffect, useRef } from "react";

import { pluginStores, useAppStore } from "@/stores/app";

export type PluginPanelProps = {
  pluginId: string;
  className?: string;
};

/**
 * The panel of a registered plugin
 *
 * Hands the plugin an empty container element to mount its user interface into,
 * and unmounts that user interface again when the plugin is unregistered, or
 * re-registered with a different `panel`. The container is emptied afterwards, so
 * a plugin only has to release what is not plain DOM.
 *
 * Errors thrown while mounting and unmounting are caught and logged, as they
 * are for a plugin's `setup` and `teardown`: a failing plugin must not take the
 * application down with it.
 */
export function PluginPanel({ pluginId, className }: PluginPanelProps) {
  const panel = useAppStore((state) => state.plugins.get(pluginId)?.panel);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (panel === undefined || container === null) {
      return;
    }
    let unmount: (() => void) | void = undefined;
    try {
      unmount = panel(container, pluginStores);
    } catch (error) {
      console.error(`Error while mounting panel of plugin ${pluginId}:`, error);
    }
    return () => {
      try {
        unmount?.();
      } catch (error) {
        console.error(
          `Error while unmounting panel of plugin ${pluginId}:`,
          error,
        );
      } finally {
        container.replaceChildren();
      }
    };
  }, [panel, pluginId]);

  return <div ref={containerRef} className={className} />;
}

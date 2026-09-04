import { startDataCaches } from "./data/cache";
import { loadProjectFromURL, projectUrlParam } from "./data/io/project";
import { enableBuiltInDataProviders } from "./data/providers";
import { notifyTissUUmapsLoaded } from "./events";
import { startPluginRegistry } from "./plugins";

/** The project loaded on startup when the URL does not name one */
const fallbackProjectUrl = "project.json";

/**
 * Starts up the parts of the application that live outside of React
 *
 * Registers the built-in data providers, starts the data caches and the plugin
 * registry, starts loading the initial project, and finally announces that the
 * application has loaded. The project is only loading, not loaded, by the time
 * this returns.
 *
 * @returns A callback that cancels the initial project loading and stops the
 * plugin registry and the data caches, invoked on hot module replacement
 */
export function bootstrap(): () => void {
  enableBuiltInDataProviders();
  const stopDataCaches = startDataCaches();
  const stopPluginRegistry = startPluginRegistry();
  const cancelInitialProjectLoading = loadInitialProject();
  notifyTissUUmapsLoaded();
  return () => {
    cancelInitialProjectLoading();
    stopPluginRegistry();
    stopDataCaches();
  };
}

/**
 * Starts loading the project named by the {@link projectUrlParam} GET
 * parameter, falling back to {@link fallbackProjectUrl} if it is absent or empty
 *
 * Failures are logged, unless loading was cancelled.
 *
 * @returns A callback that cancels the loading
 */
function loadInitialProject(): () => void {
  const abortController = new AbortController();
  const params = new URLSearchParams(window.location.search);
  const projectUrl = params.get(projectUrlParam) || fallbackProjectUrl;
  loadProjectFromURL(projectUrl, { signal: abortController.signal }).catch(
    (error) => {
      if (!abortController.signal.aborted) {
        console.error(`Failed to load project from ${projectUrl}:`, error);
      }
    },
  );
  return () => abortController.abort();
}

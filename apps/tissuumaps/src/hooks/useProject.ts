import { useEffect } from "react";

import { useTissUUmaps } from "../store";

export function useProject(projectUrlParam: string, defaultProjectUrl: string) {
  const clearProject = useTissUUmaps((state) => state.clearProject);
  const loadProjectFromURL = useTissUUmaps((state) => state.loadProjectFromURL);

  useEffect(() => {
    const abortController = new AbortController();
    const params = new URLSearchParams(window.location.search);
    const projectUrl = params.get(projectUrlParam) ?? defaultProjectUrl;
    loadProjectFromURL(projectUrl, {
      signal: abortController.signal,
      quiet: true,
    }).catch((reason) => {
      if (!abortController.signal.aborted) {
        console.error(reason);
      }
    });
    return () => {
      abortController.abort();
      clearProject();
    };
  }, [projectUrlParam, defaultProjectUrl, clearProject, loadProjectFromURL]);
}

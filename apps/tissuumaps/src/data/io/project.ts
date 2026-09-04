import { freeze } from "immer";

import {
  JSONUtils,
  type Project,
  type RawProject,
  createProject,
} from "@tissuumaps/core";

import { projectStore } from "@/stores/project";

/** The GET parameter naming the project to load */
export const projectUrlParam = "project";

/**
 * Creates a deep copy of a project, keeping only the project's own properties
 *
 * This detaches the copy from the project store, and drops the store's actions
 * as well as any other state that is not part of the project itself.
 *
 * @param project - The project to copy
 * @returns The copied project
 */
function cleanProject(project: Project): Project {
  return {
    name: project.name,
    layers: structuredClone(project.layers),
    images: structuredClone(project.images),
    labels: structuredClone(project.labels),
    points: structuredClone(project.points),
    shapes: structuredClone(project.shapes),
    tables: structuredClone(project.tables),
    markerMaps: structuredClone(project.markerMaps),
    sizeMaps: structuredClone(project.sizeMaps),
    colorMaps: structuredClone(project.colorMaps),
    visibilityMaps: structuredClone(project.visibilityMaps),
    opacityMaps: structuredClone(project.opacityMaps),
    osOptions: structuredClone(project.osOptions),
    glOptions: structuredClone(project.glOptions),
  };
}

/**
 * Loads a project into the project store, replacing the currently open project
 *
 * The loaded project is deeply frozen, so that it can only be changed through
 * the project store's actions.
 *
 * @param project - The project to load
 */
export function loadProject(project: Project): void {
  projectStore.setState(freeze(cleanProject(project), true));
}

/**
 * Fetches a project from a URL and loads it into the project store
 *
 * @param url - The URL to fetch the project from
 * @param options - Optional abort signal
 * @throws Error if the project cannot be fetched or parsed
 */
export async function loadProjectFromURL(
  url: string,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(
      `Failed to load project from ${url}: ${response.status} ${response.statusText}`,
    );
  }
  const rawProjectJSON = await response.text(); // throws on abort
  const rawProject = JSONUtils.parse(rawProjectJSON) as RawProject; // TODO validate raw project data
  const project = createProject(rawProject);
  loadProject(project);
}

/**
 * Reads a project from a file and loads it into the project store
 *
 * @param file - The file to read the project from
 * @param options - Optional abort signal
 * @throws Error if the project cannot be read or parsed
 */
export async function loadProjectFromFile(
  file: File,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const url = URL.createObjectURL(file);
  try {
    await loadProjectFromURL(url, { signal });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Saves the currently open project
 *
 * @returns The project, detached from the project store
 */
export function saveProject(): Project {
  return cleanProject(projectStore.getState());
}

/**
 * Serializes a project to JSON
 *
 * @param project - The project to serialize, defaulting to the currently open
 * project
 * @returns The serialized project
 */
export function saveProjectToJSON(project?: Project): string {
  if (project === undefined) {
    project = saveProject();
  }
  return JSONUtils.stringify(project);
}

/**
 * Serializes a project to JSON and downloads it as a `.tmap` file
 *
 * The file is named after the project, with whitespace replaced by hyphens and
 * any other non-alphanumeric characters removed, falling back to `Untitled`.
 *
 * @param project - The project to download, defaulting to the currently open
 * project
 */
export function saveAndDownloadProjectToJSON(project?: Project): void {
  if (project === undefined) {
    project = saveProject();
  }
  const sanitizedProjectName = project.name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]+/g, "")
    .replace(/^[-_]+|[-_]+$/g, "");
  const projectJSON = saveProjectToJSON(project);
  const projectBlob = new Blob([projectJSON], { type: "application/json" });
  const projectUrl = URL.createObjectURL(projectBlob);
  const projectLink = document.createElement("a");
  projectLink.download = `${sanitizedProjectName || "Untitled"}.tmap`;
  projectLink.href = projectUrl;
  projectLink.click();
  setTimeout(() => URL.revokeObjectURL(projectUrl), 60_000);
}

/**
 * Records the project URL in the address bar, so that reloading the page
 * restores the same project
 *
 * @param projectUrl - The URL the project was loaded from
 */
export function setProjectUrlParam(projectUrl: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set(projectUrlParam, projectUrl);
  window.history.replaceState({}, "", url);
}

/**
 * Removes the project URL from the address bar
 */
export function clearProjectUrlParam(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(projectUrlParam);
  window.history.replaceState({}, "", url);
}

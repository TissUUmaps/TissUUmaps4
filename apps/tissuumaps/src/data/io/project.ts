import { freeze } from "immer";

import {
  JSONUtils,
  type Project,
  type RawProject,
  createProject,
} from "@tissuumaps/core";

import { projectStore } from "@/stores/project";

/**
 * Creates a deep copy of a project, keeping only the project's own properties
 *
 * This detaches the copy from the project store, and drops the store's actions
 * as well as any other state that is not part of the project itself, such as
 * the URL the project was loaded from.
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
 * the project store's actions. The project and the URL it was loaded from are
 * written in a single update, so that the two are never out of sync for the
 * data caches, which resolve relative data source URLs against the latter.
 *
 * @param project - The project to load
 * @param projectUrl - The URL the project was loaded from, absolute or relative
 * to the document base URL, or `null` if it was not loaded from a URL
 * @throws Error if `projectUrl` is not a valid URL
 */
export function loadProject(project: Project, projectUrl: string | null): void {
  const absoluteProjectUrl =
    projectUrl !== null ? new URL(projectUrl, document.baseURI).href : null;
  projectStore.setState(
    freeze({ ...cleanProject(project), url: absoluteProjectUrl }, true),
  );
}

/**
 * Fetches a project from a URL and loads it into the project store
 *
 * The project is loaded with the URL it was actually fetched from, which is the
 * one it was redirected to, if any - so that its relative data source URLs are
 * resolved against where the project file really is.
 *
 * @param projectUrl - The URL to fetch the project from
 * @param options - Optional abort signal
 * @throws Error if the project cannot be fetched or parsed
 */
export async function loadProjectFromURL(
  projectUrl: string,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const { project, resolvedProjectUrl } = await fetchProject(
    projectUrl,
    options,
  );
  loadProject(project, resolvedProjectUrl);
}

/**
 * Reads a project from a file and loads it into the project store
 *
 * The project is loaded without a URL: the object URL through which the file is
 * read is revoked immediately afterwards, and `blob:` URLs cannot serve as a
 * base URL for the project's relative data source URLs anyway.
 *
 * @param projectFile - The file to read the project from
 * @param options - Optional abort signal
 * @throws Error if the project cannot be read or parsed
 */
export async function loadProjectFromFile(
  projectFile: File,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const objectUrl = URL.createObjectURL(projectFile);
  try {
    const { project } = await fetchProject(objectUrl, options);
    loadProject(project, null);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Fetches a project from a URL, without loading it into the project store
 *
 * @param projectUrl - The URL to fetch the project from
 * @param options - Optional abort signal
 * @returns The fetched project, and the URL it was fetched from after following
 * any redirects
 * @throws Error if the project cannot be fetched or parsed
 */
async function fetchProject(
  projectUrl: string,
  options?: { signal?: AbortSignal },
): Promise<{ project: Project; resolvedProjectUrl: string }> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const response = await fetch(projectUrl, { signal });
  if (!response.ok) {
    throw new Error(
      `Failed to load project from ${projectUrl}: ${response.status} ${response.statusText}`,
    );
  }
  const rawProjectJSON = await response.text(); // throws on abort
  const rawProject = JSONUtils.parse(rawProjectJSON) as RawProject; // TODO validate raw project data
  // response.url is empty for responses that are not the result of a request
  return {
    project: createProject(rawProject),
    resolvedProjectUrl: response.url || projectUrl,
  };
}

/**
 * Saves a project
 *
 * The project is cleaned, which detaches it from the project store and drops
 * everything that is not part of the project itself - most notably the URL it
 * was loaded from, which must never be saved. Every save path goes through
 * here, so that no such state can escape into a saved project.
 *
 * @param project - The project to save, defaulting to the currently open
 * project
 * @returns The project, detached from the project store
 */
export function saveProject(project?: Project): Project {
  return cleanProject(project ?? projectStore.getState());
}

/**
 * Serializes a project to JSON
 *
 * @param project - The project to serialize, defaulting to the currently open
 * project
 * @returns The serialized project
 */
export function saveProjectToJSON(project?: Project): string {
  return JSONUtils.stringify(saveProject(project));
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
  const savedProject = saveProject(project);
  const sanitizedProjectName = savedProject.name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]+/g, "")
    .replace(/^[-_]+|[-_]+$/g, "");
  const projectJSON = JSONUtils.stringify(savedProject);
  const projectBlob = new Blob([projectJSON], { type: "application/json" });
  const projectUrl = URL.createObjectURL(projectBlob);
  const projectLink = document.createElement("a");
  projectLink.download = `${sanitizedProjectName || "Untitled"}.tmap`;
  projectLink.href = projectUrl;
  projectLink.click();
  setTimeout(() => URL.revokeObjectURL(projectUrl), 60_000);
}

import {
  type Color,
  type Data,
  type DefaultMap,
  type Marker,
  type ProgressCallback,
  type Project,
  type RawProject,
  createProject,
  projectDefaults,
} from "@tissuumaps/core";
import type { OpenSeadragonOptions, WebGLOptions } from "@tissuumaps/render";

import { deduplicate } from "../deduplicate";
import type { TissUUmapsStateCreator } from "../index";

export type ProjectSlice = ProjectSliceState & ProjectSliceActions;

export type ProjectSliceState = {
  projectName: string;
  markerMaps: DefaultMap<Marker>[];
  sizeMaps: DefaultMap<number>[];
  colorMaps: DefaultMap<Color>[];
  visibilityMaps: DefaultMap<boolean>[];
  opacityMaps: DefaultMap<number>[];
  osOptions: OpenSeadragonOptions;
  glOptions: WebGLOptions;
};

export type ProjectSliceActions = {
  setProjectName: (name: string) => void;
  setGLOptions: (glOptions: WebGLOptions) => void;
  loadProject: (
    project: Project,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ) => Promise<void>;
  loadProjectFromURL: (
    url: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ) => Promise<void>;
  loadProjectFromFile: (
    file: File,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ) => Promise<void>;
  saveProject: () => Project;
  saveProjectToJSON: () => string;
  clearProject: () => void;
};

export const createProjectSlice: TissUUmapsStateCreator<ProjectSlice> = (
  set,
  get,
) => ({
  ...createInitialProjectSliceState(),
  setProjectName: (name) => {
    set((draft) => {
      draft.projectName = name;
    });
  },
  setGLOptions: (glOptions) => {
    set((draft) => {
      draft.glOptions = glOptions;
    });
  },
  loadProject: deduplicate(
    async (project, options) => {
      const { signal, onProgress } = options ?? {};
      signal?.throwIfAborted();
      get().clearProject();
      set({
        projectName: project.name,
        markerMaps: structuredClone(project.markerMaps),
        sizeMaps: structuredClone(project.sizeMaps),
        colorMaps: structuredClone(project.colorMaps),
        visibilityMaps: structuredClone(project.visibilityMaps),
        opacityMaps: structuredClone(project.opacityMaps),
        osOptions: structuredClone(project.osOptions as OpenSeadragonOptions),
        glOptions: structuredClone(project.glOptions),
      });
      const state = get();
      project.layers.forEach((layer) => state.addLayer(layer));
      project.tables.forEach((table) => state.addTable(table));
      project.images.forEach((image) => state.addImage(image));
      project.labels.forEach((labels) => state.addLabels(labels));
      project.points.forEach((points) => state.addPoints(points));
      project.shapes.forEach((shapes) => state.addShapes(shapes));
      const promises: Promise<Data>[] = [];
      for (const image of project.images) {
        promises.push(get().loadImage(image.id, { signal, onProgress }));
      }
      for (const labels of project.labels) {
        promises.push(get().loadLabels(labels.id, { signal, onProgress }));
      }
      for (const points of project.points) {
        promises.push(get().loadPoints(points.id, { signal, onProgress }));
      }
      for (const shapes of project.shapes) {
        promises.push(get().loadShapes(shapes.id, { signal, onProgress }));
      }
      for (const table of project.tables) {
        promises.push(get().loadTable(table.id, { signal, onProgress }));
      }
      const results = await Promise.allSettled(promises);
      signal?.throwIfAborted();
      const errors = results
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected",
        )
        .map((result) => result.reason as unknown);
      if (errors.length > 0) {
        throw new AggregateError(errors, "Failed to load project");
      }
    },
    (_project, options) => options?.signal,
  ),
  loadProjectFromURL: deduplicate(
    async (url, options) => {
      const { signal, onProgress } = options ?? {};
      signal?.throwIfAborted();
      const response = await fetch(url, { signal });
      signal?.throwIfAborted();
      if (!response.ok) {
        throw new Error(
          `Failed to load project from ${url}: ${response.status} ${response.statusText}`,
        );
      }
      const rawProjectData: unknown = await response.json();
      signal?.throwIfAborted();
      // TODO validate project data
      const project = createProject(rawProjectData as RawProject);
      await get().loadProject(project, { signal, onProgress });
    },
    (_url, options) => options?.signal,
  ),
  loadProjectFromFile: deduplicate(async (file, options) => {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const url = URL.createObjectURL(file);
    try {
      return await get().loadProjectFromURL(url, { signal, onProgress });
    } finally {
      URL.revokeObjectURL(url);
    }
  }),
  saveProject: () => {
    const state = get();
    return {
      name: state.projectName,
      layers: structuredClone(state.layers),
      images: structuredClone(state.images),
      labels: structuredClone(state.labels),
      points: structuredClone(state.points),
      shapes: structuredClone(state.shapes),
      tables: structuredClone(state.tables),
      markerMaps: structuredClone(state.markerMaps),
      sizeMaps: structuredClone(state.sizeMaps),
      colorMaps: structuredClone(state.colorMaps),
      visibilityMaps: structuredClone(state.visibilityMaps),
      opacityMaps: structuredClone(state.opacityMaps),
      osOptions: structuredClone(state.osOptions),
      glOptions: structuredClone(state.glOptions),
    };
  },
  saveProjectToJSON: () => {
    const project = get().saveProject();
    return JSON.stringify(project, null, 2);
  },
  clearProject: () => {
    get().clearImages();
    get().clearLabels();
    get().clearPoints();
    get().clearShapes();
    get().clearTables();
    get().clearLayers();
    set(createInitialProjectSliceState());
  },
});

function createInitialProjectSliceState(): ProjectSliceState {
  return {
    projectName: "New Project",
    markerMaps: [],
    sizeMaps: [],
    colorMaps: [],
    visibilityMaps: [],
    opacityMaps: [],
    osOptions: structuredClone(
      projectDefaults.osOptions as OpenSeadragonOptions,
    ),
    glOptions: structuredClone(projectDefaults.glOptions as WebGLOptions),
  };
}

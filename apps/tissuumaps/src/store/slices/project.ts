import {
  type Color,
  type DefaultMap,
  type DrawOptions,
  Marker,
  type ProgressCallback,
  type Project,
  type RawProject,
  type ViewerOptions,
  createProject,
  projectDefaults,
} from "@tissuumaps/core";

import { deduplicate } from "../deduplicate";
import { type TissUUmapsStateCreator } from "../index";

export type ProjectSlice = ProjectSliceState & ProjectSliceActions;

export type ProjectSliceState = {
  projectName: string;
  markerMaps: DefaultMap<Marker>[];
  sizeMaps: DefaultMap<number>[];
  colorMaps: DefaultMap<Color>[];
  visibilityMaps: DefaultMap<boolean>[];
  opacityMaps: DefaultMap<number>[];
  drawOptions: DrawOptions;
  viewerOptions: ViewerOptions;
  viewerAnimationStartOptions: ViewerOptions;
  viewerAnimationFinishOptions: ViewerOptions;
};

export type ProjectSliceActions = {
  setProjectName: (name: string) => void;
  loadProject: (
    project: Project,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ) => Promise<void>;
  loadProjectFromURL: (
    url: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ) => Promise<void>;
  saveProject: () => Project;
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
  loadProject: deduplicate(
    async (project, options) => {
      const { signal, onProgress } = options ?? {};
      signal?.throwIfAborted();
      get().clearProject();
      // first, add layers
      for (const layer of project.layers) {
        get().addLayer(layer);
      }
      // then, add and asynchronously load data objects
      {
        const state = get();
        const tablePromises = project.tables.map((table) => {
          state.addTable(table);
          return state.loadTable(table.id, { signal, onProgress });
        });
        await Promise.all(tablePromises);
        signal?.throwIfAborted();
      }
      // finally, add and asynchronously load rendered data objects
      {
        const state = get();
        const imagePromises = project.images.map((image) => {
          state.addImage(image);
          return state.loadImage(image.id, { signal, onProgress });
        });
        const labelsPromises = project.labels.map((labels) => {
          state.addLabels(labels);
          return state.loadLabels(labels.id, { signal, onProgress });
        });
        const pointsPromises = project.points.map((points) => {
          state.addPoints(points);
          return state.loadPoints(points.id, { signal, onProgress });
        });
        const shapesPromises = project.shapes.map((shapes) => {
          state.addShapes(shapes);
          return state.loadShapes(shapes.id, { signal, onProgress });
        });
        await Promise.all([
          ...imagePromises,
          ...labelsPromises,
          ...pointsPromises,
          ...shapesPromises,
        ]);
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
      drawOptions: structuredClone(state.drawOptions),
      viewerOptions: structuredClone(state.viewerOptions),
      viewerAnimationStartOptions: structuredClone(
        state.viewerAnimationStartOptions,
      ),
      viewerAnimationFinishOptions: structuredClone(
        state.viewerAnimationFinishOptions,
      ),
    };
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
    drawOptions: projectDefaults.drawOptions,
    viewerOptions: projectDefaults.viewerOptions,
    viewerAnimationStartOptions: projectDefaults.viewerAnimationStartOptions,
    viewerAnimationFinishOptions: projectDefaults.viewerAnimationFinishOptions,
  };
}

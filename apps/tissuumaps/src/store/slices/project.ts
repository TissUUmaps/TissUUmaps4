import {
  type Color,
  type DefaultMap,
  type DrawOptions,
  type Marker,
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
  setDrawOptions: (options: Partial<DrawOptions>) => void;
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
  setDrawOptions: (options) => {
    set((draft) => {
      draft.drawOptions = { ...draft.drawOptions, ...options };
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
        drawOptions: structuredClone(project.drawOptions),
        viewerOptions: structuredClone(project.viewerOptions),
        viewerAnimationStartOptions: structuredClone(
          project.viewerAnimationStartOptions,
        ),
        viewerAnimationFinishOptions: structuredClone(
          project.viewerAnimationFinishOptions,
        ),
      });
      // first, add layers
      for (const layer of project.layers) {
        get().addLayer(layer);
      }
      // then, add and asynchronously load data objects
      {
        const tablePromises = project.tables.map((table) => {
          get().addTable(table);
          return get().loadTable(table.id, { signal, onProgress });
        });
        await Promise.all(tablePromises);
        signal?.throwIfAborted();
      }
      // finally, add and asynchronously load rendered data objects
      {
        const imagePromises = project.images.map((image) => {
          get().addImage(image);
          return get().loadImage(image.id, { signal, onProgress });
        });
        const labelsPromises = project.labels.map((labels) => {
          get().addLabels(labels);
          return get().loadLabels(labels.id, { signal, onProgress });
        });
        const pointsPromises = project.points.map((points) => {
          get().addPoints(points);
          return get().loadPoints(points.id, { signal, onProgress });
        });
        const shapesPromises = project.shapes.map((shapes) => {
          get().addShapes(shapes);
          return get().loadShapes(shapes.id, { signal, onProgress });
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
    drawOptions: projectDefaults.drawOptions,
    viewerOptions: projectDefaults.viewerOptions,
    viewerAnimationStartOptions: projectDefaults.viewerAnimationStartOptions,
    viewerAnimationFinishOptions: projectDefaults.viewerAnimationFinishOptions,
  };
}

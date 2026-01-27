import {
  type Color,
  type DrawOptions,
  Marker,
  type Project,
  type RawProject,
  type ValueMap,
  type ViewerOptions,
  createProject,
  projectDefaults,
} from "@tissuumaps/core";

import { type TissUUmapsStateCreator } from "./index";

export type ProjectSlice = ProjectSliceState & ProjectSliceActions;

export type ProjectSliceState = {
  projectName: string;
  markerMaps: Map<string, ValueMap<Marker>>;
  sizeMaps: Map<string, ValueMap<number>>;
  colorMaps: Map<string, ValueMap<Color>>;
  visibilityMaps: Map<string, ValueMap<boolean>>;
  opacityMaps: Map<string, ValueMap<number>>;
  drawOptions: DrawOptions;
  viewerOptions: ViewerOptions;
  viewerAnimationStartOptions: ViewerOptions;
  viewerAnimationFinishOptions: ViewerOptions;
};

export type ProjectSliceActions = {
  setProjectName: (name: string) => void;
  // TODO actions for maps, drawOptions, viewerOptions
  loadProject: (
    project: Project,
    options: { signal?: AbortSignal },
  ) => Promise<void>;
  loadProjectFromURL: (
    url: string,
    options: {
      signal?: AbortSignal;
      quiet?: boolean;
    },
  ) => Promise<void>;
  saveProject: () => Project;
  clearProject: () => void;
};

export const createProjectSlice: TissUUmapsStateCreator<ProjectSlice> = (
  set,
  get,
) => ({
  ...initialProjectSliceState,
  setProjectName: (name) => {
    set((draft) => {
      draft.projectName = name;
    });
  },
  loadProject: async (project, { signal }: { signal?: AbortSignal } = {}) => {
    signal?.throwIfAborted();
    const state = get();
    state.clearProject();
    set((draft) => {
      draft.projectName = project.name;
      draft.markerMaps = new Map(project.markerMaps?.map((m) => [m.id, m]));
      draft.sizeMaps = new Map(project.sizeMaps?.map((m) => [m.id, m]));
      draft.colorMaps = new Map(project.colorMaps?.map((m) => [m.id, m]));
      draft.visibilityMaps = new Map(
        project.visibilityMaps?.map((m) => [m.id, m]),
      );
      draft.opacityMaps = new Map(project.opacityMaps?.map((m) => [m.id, m]));
      draft.drawOptions = project.drawOptions;
      draft.viewerOptions = project.viewerOptions;
      draft.viewerAnimationStartOptions = project.viewerAnimationStartOptions;
      draft.viewerAnimationFinishOptions = project.viewerAnimationFinishOptions;
    });
    // first, add layers
    for (const layer of project.layers) {
      state.addLayer(layer);
    }
    // then, load data objects
    const loadDataObjectPromises = [];
    for (const table of project.tables) {
      state.addTable(table);
      loadDataObjectPromises.push(state.loadTable(table.id, { signal }));
    }
    await Promise.all(loadDataObjectPromises);
    signal?.throwIfAborted();
    // finally, load rendered data objects
    const loadRenderedDataObjectPromises = [];
    for (const image of project.images) {
      state.addImage(image);
      loadRenderedDataObjectPromises.push(
        state.loadImage(image.id, { signal }),
      );
    }
    for (const labels of project.labels) {
      state.addLabels(labels);
      loadRenderedDataObjectPromises.push(
        state.loadLabels(labels.id, { signal }),
      );
    }
    for (const points of project.points) {
      state.addPoints(points);
      loadRenderedDataObjectPromises.push(
        state.loadPoints(points.id, { signal }),
      );
    }
    for (const shapes of project.shapes) {
      state.addShapes(shapes);
      loadRenderedDataObjectPromises.push(
        state.loadShapes(shapes.id, { signal }),
      );
    }
    await Promise.all(loadRenderedDataObjectPromises);
    signal?.throwIfAborted();
  },
  loadProjectFromURL: async (
    url,
    { signal, quiet = false }: { signal?: AbortSignal; quiet?: boolean } = {},
  ) => {
    signal?.throwIfAborted();
    const state = get();
    const response = await fetch(url);
    signal?.throwIfAborted();
    if (!response.ok) {
      if (quiet) {
        console.warn(
          `Failed to load project from ${url}: ${response.status} ${response.statusText}`,
        );
        return;
      } else {
        throw new Error(
          `Failed to load project from ${url}: ${response.status} ${response.statusText}`,
        );
      }
    }
    const rawProject = (await response.json()) as RawProject; // TODO validate project
    signal?.throwIfAborted();
    const project = createProject(rawProject);
    await state.loadProject(project, { signal });
    signal?.throwIfAborted();
  },
  saveProject: () => {
    // TODO
    throw new Error("Not implemented yet");
  },
  clearProject: () => {
    const state = get();
    state.clearImages();
    state.clearLabels();
    state.clearPoints();
    state.clearShapes();
    state.clearTables();
    state.clearLayers();
    set(initialProjectSliceState);
  },
});

const initialProjectSliceState: ProjectSliceState = {
  projectName: "New Project",
  markerMaps: new Map(),
  sizeMaps: new Map(),
  colorMaps: new Map(),
  visibilityMaps: new Map(),
  opacityMaps: new Map(),
  drawOptions: projectDefaults.drawOptions,
  viewerOptions: projectDefaults.viewerOptions,
  viewerAnimationStartOptions: projectDefaults.viewerAnimationStartOptions,
  viewerAnimationFinishOptions: projectDefaults.viewerAnimationFinishOptions,
};

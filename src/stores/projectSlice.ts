import { createImage } from "../models/image";
import { createLabels } from "../models/labels";
import { createLayer } from "../models/layer";
import { createPoints } from "../models/points";
import {
  DEFAULT_DRAW_OPTIONS,
  DEFAULT_VIEWER_ANIMATION_FINISH_OPTIONS,
  DEFAULT_VIEWER_ANIMATION_START_OPTIONS,
  DEFAULT_VIEWER_OPTIONS,
  Project,
  RawProject,
  createProject,
} from "../models/project";
import { createShapes } from "../models/shapes";
import { createTable } from "../models/table";
import {
  Color,
  DrawOptions,
  Marker,
  PropertyMap,
  ViewerOptions,
} from "../types";
import { BoundStoreStateCreator } from "./boundStore";

export type ProjectSlice = ProjectSliceState & ProjectSliceActions;

export type ProjectSliceState = {
  projectName: string;
  sizeMaps: Map<string, PropertyMap<number>>;
  colorMaps: Map<string, PropertyMap<Color>>;
  visibilityMaps: Map<string, PropertyMap<boolean>>;
  opacityMaps: Map<string, PropertyMap<number>>;
  markerMaps: Map<string, PropertyMap<Marker>>;
  drawOptions: DrawOptions;
  viewerOptions: ViewerOptions;
  viewerAnimationStartOptions: ViewerOptions;
  viewerAnimationFinishOptions: ViewerOptions;
};

export type ProjectSliceActions = {
  setProjectName: (name: string) => void;
  // TODO actions for maps, drawOptions, viewerOptions
  loadProject: (project: Project, signal?: AbortSignal) => Promise<void>;
  loadProjectFromURL: (
    url: string,
    signal?: AbortSignal,
    quiet?: boolean,
  ) => Promise<void>;
  clearProject: () => void;
};

export const createProjectSlice: BoundStoreStateCreator<ProjectSlice> = (
  set,
  get,
) => ({
  ...initialProjectSliceState,
  setProjectName: (name) => {
    set((draft) => {
      draft.projectName = name;
    });
  },
  loadProject: async (project, signal) => {
    signal?.throwIfAborted();
    const state = get();
    state.clearImages();
    state.clearLabels();
    state.clearPoints();
    state.clearShapes();
    state.clearTables();
    state.clearLayers();
    set((draft) => {
      draft.projectName = project.name;
      draft.sizeMaps = new Map(project.sizeMaps?.map((m) => [m.id, m]));
      draft.colorMaps = new Map(project.colorMaps?.map((m) => [m.id, m]));
      draft.visibilityMaps = new Map(
        project.visibilityMaps?.map((m) => [m.id, m]),
      );
      draft.opacityMaps = new Map(project.opacityMaps?.map((m) => [m.id, m]));
      draft.markerMaps = new Map(project.markerMaps?.map((m) => [m.id, m]));
      draft.drawOptions = project.drawOptions;
      draft.viewerOptions = project.viewerOptions;
      draft.viewerAnimationStartOptions = project.viewerAnimationStartOptions;
      draft.viewerAnimationFinishOptions = project.viewerAnimationFinishOptions;
    });
    // first, add layers
    if (project.layers !== undefined) {
      for (const rawLayer of project.layers) {
        const layer = createLayer(rawLayer);
        state.addLayer(layer);
      }
    }
    // then, load table data
    const loadTablePromises = [];
    if (project.tables !== undefined) {
      for (const rawTable of project.tables) {
        const table = createTable(rawTable);
        state.addTable(table);
        loadTablePromises.push(state.loadTable(table, signal));
      }
    }
    await Promise.all(loadTablePromises);
    signal?.throwIfAborted();
    // finally, load table-dependent data
    const loadPromises = [];
    if (project.images !== undefined) {
      for (const rawImage of project.images) {
        const image = createImage(rawImage);
        state.addImage(image);
        loadPromises.push(state.loadImage(image, signal));
      }
    }
    if (project.labels !== undefined) {
      for (const rawLabels of project.labels) {
        const labels = createLabels(rawLabels);
        state.addLabels(labels);
        loadPromises.push(state.loadLabels(labels, signal));
      }
    }
    if (project.points !== undefined) {
      for (const rawPoints of project.points) {
        const points = createPoints(rawPoints);
        state.addPoints(points);
        loadPromises.push(state.loadPoints(points, signal));
      }
    }
    if (project.shapes !== undefined) {
      for (const rawShapes of project.shapes) {
        const shapes = createShapes(rawShapes);
        state.addShapes(shapes);
        loadPromises.push(state.loadShapes(shapes, signal));
      }
    }
    await Promise.all(loadPromises);
    signal?.throwIfAborted();
  },
  loadProjectFromURL: async (url, signal, quiet) => {
    signal?.throwIfAborted();
    const state = get();
    const response = await fetch(url);
    signal?.throwIfAborted();
    if (!response.ok) {
      if (quiet) {
        console.warn(
          `Failed to load project from ${url}: ${response.statusText}`,
        );
        return;
      } else {
        throw new Error(
          `Failed to load project from ${url}: ${response.statusText}`,
        );
      }
    }
    const rawProject = (await response.json()) as RawProject; // TODO validate project
    signal?.throwIfAborted();
    const project = createProject(rawProject);
    await state.loadProject(project);
    signal?.throwIfAborted();
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
  sizeMaps: new Map(),
  colorMaps: new Map(),
  visibilityMaps: new Map(),
  opacityMaps: new Map(),
  markerMaps: new Map(),
  drawOptions: DEFAULT_DRAW_OPTIONS,
  viewerOptions: DEFAULT_VIEWER_OPTIONS,
  viewerAnimationStartOptions: DEFAULT_VIEWER_ANIMATION_START_OPTIONS,
  viewerAnimationFinishOptions: DEFAULT_VIEWER_ANIMATION_FINISH_OPTIONS,
};

import { completeImage } from "../model/image";
import { completeLabels } from "../model/labels";
import { completeLayer } from "../model/layer";
import { completePoints } from "../model/points";
import {
  CompleteProject,
  DEFAULT_PROJECT_DRAW_OPTIONS,
  DEFAULT_PROJECT_VIEWER_ANIMATION_FINISH_OPTIONS,
  DEFAULT_PROJECT_VIEWER_ANIMATION_START_OPTIONS,
  DEFAULT_PROJECT_VIEWER_OPTIONS,
  Project,
  completeProject,
} from "../model/project";
import { completeShapes } from "../model/shapes";
import { completeTable } from "../model/table";
import {
  ColorMap,
  DrawOptions,
  Marker,
  ValueMap,
  ViewerOptions,
} from "../types";
import { BoundStoreStateCreator } from "./boundStore";

export type ProjectSlice = ProjectSliceState & ProjectSliceActions;

export type ProjectSliceState = {
  projectName: string;
  markerMaps: Map<string, ValueMap<Marker>>;
  sizeMaps: Map<string, ValueMap<number>>;
  colorMaps: Map<string, ColorMap>;
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
    project: CompleteProject,
    signal?: AbortSignal,
  ) => Promise<void>;
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
    if (project.layers !== undefined) {
      for (const rawLayer of project.layers) {
        const layer = completeLayer(rawLayer);
        state.addLayer(layer);
      }
    }
    // then, load data objects
    const loadDataObjectPromises = [];
    if (project.tables !== undefined) {
      for (const rawTable of project.tables) {
        const table = completeTable(rawTable);
        state.addTable(table);
        loadDataObjectPromises.push(state.loadTable(table, signal));
      }
    }
    await Promise.all(loadDataObjectPromises);
    signal?.throwIfAborted();
    // finally, load rendered data objects
    const loadRenderedDataObjectPromises = [];
    if (project.images !== undefined) {
      for (const rawImage of project.images) {
        const image = completeImage(rawImage);
        state.addImage(image);
        loadRenderedDataObjectPromises.push(state.loadImage(image, signal));
      }
    }
    if (project.labels !== undefined) {
      for (const rawLabels of project.labels) {
        const labels = completeLabels(rawLabels);
        state.addLabels(labels);
        loadRenderedDataObjectPromises.push(state.loadLabels(labels, signal));
      }
    }
    if (project.points !== undefined) {
      for (const rawPoints of project.points) {
        const points = completePoints(rawPoints);
        state.addPoints(points);
        loadRenderedDataObjectPromises.push(state.loadPoints(points, signal));
      }
    }
    if (project.shapes !== undefined) {
      for (const rawShapes of project.shapes) {
        const shapes = completeShapes(rawShapes);
        state.addShapes(shapes);
        loadRenderedDataObjectPromises.push(state.loadShapes(shapes, signal));
      }
    }
    await Promise.all(loadRenderedDataObjectPromises);
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
    const rawProject = (await response.json()) as Project; // TODO validate project
    signal?.throwIfAborted();
    const project = completeProject(rawProject);
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
  markerMaps: new Map(),
  sizeMaps: new Map(),
  colorMaps: new Map(),
  visibilityMaps: new Map(),
  opacityMaps: new Map(),
  drawOptions: DEFAULT_PROJECT_DRAW_OPTIONS,
  viewerOptions: DEFAULT_PROJECT_VIEWER_OPTIONS,
  viewerAnimationStartOptions: DEFAULT_PROJECT_VIEWER_ANIMATION_START_OPTIONS,
  viewerAnimationFinishOptions: DEFAULT_PROJECT_VIEWER_ANIMATION_FINISH_OPTIONS,
};

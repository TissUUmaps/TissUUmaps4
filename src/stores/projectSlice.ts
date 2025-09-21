import { BlendMode, Color, Marker } from "../models/types";
import { BoundStoreStateCreator } from "./boundStore";

export type ProjectSlice = ProjectSliceState & ProjectSliceActions;

export type ProjectSliceState = {
  projectName: string;
  projectDir: FileSystemDirectoryHandle | null;
  sizeMaps: Map<string, Map<string, number>>;
  colorMaps: Map<string, Map<string, Color>>;
  visibilityMaps: Map<string, Map<string, boolean>>;
  opacityMaps: Map<string, Map<string, number>>;
  markerMaps: Map<string, Map<string, Marker>>;
  blendMode: BlendMode;
  pointSizeFactor: number;
};

export type ProjectSliceActions = {
  setProjectName: (projectName: string) => void;
  setProjectDir: (projectDir: FileSystemDirectoryHandle | null) => void;
  setBlendMode: (blendMode: BlendMode) => void;
  setPointSizeFactor: (pointSizeFactor: number) => void;
};

export const createProjectSlice: BoundStoreStateCreator<ProjectSlice> = (
  set,
) => ({
  ...initialProjectSliceState,
  setProjectName: (projectName) => {
    set((draft) => {
      draft.projectName = projectName;
    });
  },
  setProjectDir: (projectDir) => {
    set((draft) => {
      draft.projectDir = projectDir;
    });
  },
  setBlendMode: (blendMode) => {
    set((draft) => {
      draft.blendMode = blendMode;
    });
  },
  setPointSizeFactor: (pointSizeFactor) => {
    set((draft) => {
      draft.pointSizeFactor = pointSizeFactor;
    });
  },
});

const initialProjectSliceState: ProjectSliceState = {
  projectName: "New Project",
  projectDir: null,
  sizeMaps: new Map(),
  colorMaps: new Map(),
  visibilityMaps: new Map(),
  opacityMaps: new Map(),
  markerMaps: new Map(),
  blendMode: "over",
  pointSizeFactor: 1.0,
};

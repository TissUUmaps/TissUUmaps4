import { defaultPointsSettings } from "../model/points";
import Project, { defaultProjectSettings } from "../model/project";
import { SharedStoreSliceCreator } from "./sharedStore";

export type ProjectState = Project;

export type ProjectActions = {
  setActivePointsSettingsProfile: (
    pointsId: string,
    activeProfileId: string,
  ) => void;
};

export type ProjectSlice = ProjectState & ProjectActions;

const initialProjectState: ProjectState = {
  name: "New project",
  layers: {},
  allPoints: {
    dummy: {
      name: "My points",
      data: { type: "hdf5", config: {} },
      settings: { ...defaultPointsSettings },
    },
  }, // TODO remove dummy data
  allShapes: {},
  settings: defaultProjectSettings,
};

export const createProjectSlice: SharedStoreSliceCreator<ProjectSlice> = (
  set,
) => ({
  ...initialProjectState,
  setActivePointsSettingsProfile: (pointsId, activeProfileId) =>
    set((state) => {
      state.allPoints[pointsId].settings.activeProfileId = activeProfileId;
    }),
});

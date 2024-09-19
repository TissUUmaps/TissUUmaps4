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
  layers: new Map(),
  allPoints: new Map([
    [
      "dummy",
      {
        name: "My points",
        data: { type: "hdf5", config: {} },
        settings: { ...defaultPointsSettings },
      },
    ],
  ]), // TODO remove dummy data
  allShapes: new Map(),
  settings: defaultProjectSettings,
};

export const createProjectSlice: SharedStoreSliceCreator<ProjectSlice> = (
  set,
) => ({
  ...initialProjectState,
  setActivePointsSettingsProfile: (pointsId, activeProfileId) =>
    set((state) => {
      const points = state.allPoints.get(pointsId);
      if (!points) {
        throw Error(`Points not found: ${pointsId}`);
      }
      points.settings.activeProfileId = activeProfileId;
      state.allPoints = new Map(state.allPoints).set(pointsId, points); // TODO is map creation necessary?
    }),
});

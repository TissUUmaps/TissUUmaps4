import { defaultPointsSettings } from "../model/points";
import Project, { defaultProjectSettings } from "../model/project";
import OrderedMap from "../utils/OrderedMap";
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
  layers: new OrderedMap(),
  allPoints: new OrderedMap([
    [
      "dummy",
      {
        name: "My points",
        data: { type: "hdf5", config: {} },
        settings: { ...defaultPointsSettings },
      },
    ],
  ]), // TODO remove dummy data
  allShapes: new OrderedMap(),
  settings: defaultProjectSettings,
};

export const createProjectSlice: SharedStoreSliceCreator<ProjectSlice> = (
  set,
) => ({
  ...initialProjectState,
  setActivePointsSettingsProfile: (pointsId, activeProfileId) =>
    set((draft) => {
      const points = draft.allPoints.get(pointsId);
      if (!points) {
        throw new Error(`Points not found: ${pointsId}`);
      }
      points.settings.activeProfileId = activeProfileId;
    }),
});

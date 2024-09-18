import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { defaultPointsSettings } from "../model/points";
import Project, { defaultProjectSettings } from "../model/project";

export type ProjectState = Project;

export type ProjectActions = {
  setActivePointsSettingsProfile: (
    pointsKey: string,
    activeProfileKey: string,
  ) => void;
};

export type ProjectStore = ProjectState & ProjectActions;

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

const useProjectStore = create<ProjectStore>()(
  immer((set) => ({
    ...initialProjectState,
    // FIXME use immer correctly in setActivePointsSettingsProfile
    setActivePointsSettingsProfile: (pointsKey, activeProfileKey) =>
      set((state) => {
        const points = state.allPoints.get(pointsKey)!;
        points.settings.activeProfileKey = activeProfileKey;
      }),
  })),
);

export default useProjectStore;

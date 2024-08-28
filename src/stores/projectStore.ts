import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import Project from "../model/project";

export type ProjectState = Project;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ProjectActions = {};

export type ProjectStore = ProjectState & ProjectActions;

const initialProjectState: ProjectState = {
  layers: [],
  // points: [],
  // shapes: [],
};

const useProjectStore = create<ProjectStore>()(
  immer(() => ({
    ...initialProjectState,
  })),
);

export default useProjectStore;

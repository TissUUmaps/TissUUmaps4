import { BoundStoreStateCreator } from "./boundStore";

export type ProjectSlice = ProjectSliceState & ProjectSliceActions;

export type ProjectSliceState = {
  projectName: string;
};

export type ProjectSliceActions = {
  setProjectName: (projectName: string) => void;
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
});

const initialProjectSliceState: ProjectSliceState = {
  projectName: "New Project",
};

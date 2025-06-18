import { BoundStoreStateCreator } from "./boundStore";

export type ProjectSlice = ProjectSliceState & ProjectSliceActions;

export type ProjectSliceState = {
  projectName: string;
};

export type ProjectSliceActions = {
  setProjectName: (name: string) => void;
};

export const createProjectSlice: BoundStoreStateCreator<ProjectSlice> = (
  set,
) => ({
  ...initialProjectSliceState,
  setProjectName: (name) =>
    set((draft) => {
      draft.projectName = name;
    }),
});

const initialProjectSliceState: ProjectSliceState = {
  projectName: "New Project",
};

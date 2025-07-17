import { BoundStoreStateCreator } from "./boundStore";

export type ProjectSlice = ProjectSliceState & ProjectSliceActions;

export type ProjectSliceState = {
  projectName: string;
  projectDir: FileSystemDirectoryHandle | null;
};

export type ProjectSliceActions = {
  setProjectName: (projectName: string) => void;
  setProjectDir: (projectDir: FileSystemDirectoryHandle | null) => void;
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
});

const initialProjectSliceState: ProjectSliceState = {
  projectName: "New Project",
  projectDir: null,
};

import { StateCreator } from "zustand";
import { TissUUmapsStore } from "./tissUUmapsStore";
import Project from "../model/project";

export type ProjectState = Project;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ProjectActions = {};

export type ProjectSlice = ProjectState & ProjectActions;

const initialProjectState: ProjectState = {
  images: [],
  points: [],
  shapes: [],
};

export const createProjectSlice: StateCreator<
  TissUUmapsStore,
  [],
  [],
  ProjectSlice
> = () => ({
  ...initialProjectState,
});

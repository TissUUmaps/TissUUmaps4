import { StateCreator, create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { AppSlice, createAppSlice } from "./appSlice";
import { ProjectSlice, createProjectSlice } from "./projectSlice";

export type SharedStoreSliceCreator<T> = StateCreator<
  SharedStore,
  [["zustand/immer", never]],
  [],
  T
>;

export type SharedState = AppSlice & ProjectSlice;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type SharedActions = {};

export type SharedStore = SharedState & SharedActions;

const useSharedStore = create<SharedStore>()(
  immer((set, get, store) => ({
    ...createAppSlice(set, get, store),
    ...createProjectSlice(set, get, store),
  })),
);

export default useSharedStore;

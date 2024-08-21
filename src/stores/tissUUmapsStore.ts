import { create } from "zustand";
import { AppSlice, createAppSlice } from "./appSlice";
import { createProjectSlice, ProjectSlice } from "./projectSlice";

export type TissUUmapsStore = AppSlice & ProjectSlice;

export const useTissUUmapsStore = create<TissUUmapsStore>()((...a) => ({
  ...createAppSlice(...a),
  ...createProjectSlice(...a),
}));

import { StateCreator } from "zustand";
import { TissUUmapsStore } from "./tissUUmapsStore";

export type AppState = {
  appLoaded: boolean;
};

export type AppActions = {
  setAppLoaded: (appLoaded: boolean) => void;
};

export type AppSlice = AppState & AppActions;

const initialAppState: AppState = {
  appLoaded: false,
};

export const createAppSlice: StateCreator<TissUUmapsStore, [], [], AppSlice> = (
  set,
) => ({
  ...initialAppState,
  setAppLoaded: (appLoaded) => {
    set({ appLoaded: appLoaded });
  },
});

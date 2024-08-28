import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type AppState = {};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type AppActions = {};

export type AppStore = AppState & AppActions;

const initialAppState: AppState = {
  appLoaded: false,
};

const useAppStore = create<AppStore>()(
  immer(() => ({
    ...initialAppState,
  })),
);

export default useAppStore;

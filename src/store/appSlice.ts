import { SharedStoreSliceCreator } from "./sharedStore";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type AppState = {};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type AppActions = {};

export type AppSlice = AppState & AppActions;

const initialAppState: AppState = {};

export const createAppSlice: SharedStoreSliceCreator<AppSlice> = () => ({
  ...initialAppState,
});

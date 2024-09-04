export interface PointsDataProvider {
  getVariables(): string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getData(variable: string): any; // TODO: define return type
}

export enum PointsSetting {
  Color,
  Shape,
  Size,
  // ... TODO: add more settings
}

export interface PointsSettingsPreset {
  name: string;
  profile: string | null; // TODO: profile ID type
  variables: string[];
  targetSettings: PointsSetting[];
}

export const defaultPointsSettingsPreset: PointsSettingsPreset = {
  name: "New preset",
  profile: null,
  variables: [],
  targetSettings: [],
};

export type PointsSettingValueVariable = { valueVariable: string };
export type PointsSettingCategoryVariable = { categoryVariable: string };

export interface PointsSettingsProfile {
  name: string;
  color: string | PointsSettingValueVariable | PointsSettingCategoryVariable;
}

export const defaultPointsSettingsProfile: PointsSettingsProfile = {
  name: "New profile",
  color: "#000000",
};

export interface PointsSettings {
  presets: PointsSettingsPreset[];
  profiles: PointsSettingsProfile[];
  selectedProfile: string; // TODO: profile ID type
  selectedGroupByVariable?: string;
  allVariablesTargetSettings: PointsSetting[];
}

export const defaultPointsSettings: PointsSettings = {
  presets: [],
  profiles: [{ ...defaultPointsSettingsProfile }],
  selectedProfile: defaultPointsSettingsProfile.name, // TODO: profile ID
  allVariablesTargetSettings: [],
};

export interface Points {
  dataProvider: PointsDataProvider;
  settings: PointsSettings;
}

export default Points;

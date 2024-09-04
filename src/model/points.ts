export interface PointsDataProvider {
  getVariables(): string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getData(variable: string): any; // TODO: define return type
}

export enum PointSetting {
  Color,
  Shape,
  Size,
  // ... TODO: add more settings
}

export enum PointSettingSource {
  Value,
  ValueVariable,
  CategoryVariable,
}

export interface PointsSettingsPreset {
  name: string;
  profile: string | null; // TODO: profile ID type
  variables: string[];
  targetSettings: PointSetting[];
}

export interface PointsSettingsProfile {
  name: string;
  colorSource: PointSettingSource;
  colorValue: string;
  colorValueVariable: string;
  colorCategoryVariable: string;
}

export interface PointsSettings {
  presets: PointsSettingsPreset[];
  profiles: PointsSettingsProfile[];
  selectedProfile: string; // TODO: profile ID type
  selectedGroupByVariable: string;
  allVariablesTargetSettings: PointSetting[];
}

export interface Points {
  dataProvider: PointsDataProvider;
  settings: PointsSettings;
}

export default Points;

type PointsSettingValueVariable = { valueVariable: string };
type PointsSettingGroupVariable = { groupVariable: string };

export interface PointsSettingsPreset {
  name: string;
  variables: string[];
  setsColor: boolean;
  setsShape: boolean;
  setsSize: boolean;
  setsVisibility: boolean;
  setsZOrder: boolean;
  targetProfile?: string;
}

export const defaultPointsSettingsPreset: PointsSettingsPreset = {
  name: "New preset",
  variables: [],
  setsColor: false,
  setsShape: false,
  setsSize: false,
  setsVisibility: false,
  setsZOrder: false,
};

export interface PointsGroupSettings {
  color?: string;
  shape?: string;
  size?: number;
  visibility?: boolean;
  zorder?: number;
}

export interface PointsSettingsProfile {
  name: string;
  pos: {
    x: PointsSettingValueVariable;
    y: PointsSettingValueVariable;
    layer?: string | PointsSettingValueVariable | PointsSettingGroupVariable;
  }[];
  color:
    | { r: number; g: number; b: number; a?: number }
    | PointsSettingValueVariable
    | PointsSettingGroupVariable;
  shape: string | PointsSettingValueVariable | PointsSettingGroupVariable; // TODO: define shape type
  size: number | PointsSettingValueVariable | PointsSettingGroupVariable;
  visibility: boolean | PointsSettingValueVariable | PointsSettingGroupVariable;
  zorder: number | PointsSettingValueVariable | PointsSettingGroupVariable;
  groupsSettings: {
    [groupVariable: string]: { [group: string]: PointsGroupSettings };
  };
}

export const defaultPointsSettingsProfile: PointsSettingsProfile = {
  name: "New profile",
  pos: [{ x: { valueVariable: "x" }, y: { valueVariable: "y" } }],
  color: { r: 1, g: 1, b: 1 },
  shape: "circle", // TODO: default shape
  size: 5, // TODO: default size
  visibility: true,
  zorder: 0, // TODO: default zorder
  groupsSettings: {},
};

export interface PointsSettings {
  presets: PointsSettingsPreset[];
  profiles: PointsSettingsProfile[];
  selectedProfile?: string;
  selectedGroupVariable?: string;
}

export const defaultPointsSettings: PointsSettings = {
  presets: [],
  profiles: [{ ...defaultPointsSettingsProfile }],
};

export interface Points {
  data: { type: string; config: unknown };
  settings: PointsSettings;
}

export default Points;

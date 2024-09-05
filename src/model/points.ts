type PointsSettingValuesVariable = { valuesVariable: string };
type PointsSettingGroupsVariable = { groupsVariable: string };

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
    x: PointsSettingValuesVariable;
    y: PointsSettingValuesVariable;
    layer?: string | PointsSettingValuesVariable | PointsSettingGroupsVariable;
  }[];
  color:
    | { r: number; g: number; b: number; a?: number }
    | PointsSettingValuesVariable
    | PointsSettingGroupsVariable;
  shape: string | PointsSettingValuesVariable | PointsSettingGroupsVariable; // TODO: define shape type
  size: number | PointsSettingValuesVariable | PointsSettingGroupsVariable;
  visibility:
    | boolean
    | PointsSettingValuesVariable
    | PointsSettingGroupsVariable;
  zorder: number | PointsSettingValuesVariable | PointsSettingGroupsVariable;
  groupSettings: {
    [groupsVariable: string]: { [group: string]: PointsGroupSettings };
  };
}

export const defaultPointsSettingsProfile: PointsSettingsProfile = {
  name: "New profile",
  pos: [{ x: { valuesVariable: "x" }, y: { valuesVariable: "y" } }],
  color: { r: 1, g: 1, b: 1 },
  shape: "circle", // TODO: default shape
  size: 5, // TODO: default size
  visibility: true,
  zorder: 0, // TODO: default zorder
  groupSettings: {},
};

export interface PointsSettings {
  presets: PointsSettingsPreset[];
  profiles: PointsSettingsProfile[];
  selectedProfile?: string;
  selectedGroupsVariable?: string;
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

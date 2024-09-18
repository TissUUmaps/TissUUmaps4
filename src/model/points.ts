import { PointsProviderConfig } from "../utils/IOUtils";

type PointPosition = {
  x: PointValuesVariable;
  y: PointValuesVariable;
  layer?: string | PointValuesVariable | PointGroupsVariable;
};
type PointColor = { r: number; g: number; b: number; a?: number };
type PointShape = string; // TODO define point shape type
type PointSize = number;
type PointVisibility = boolean;
type PointZOrder = number;

export type PointValuesVariable = { valuesVariable: string };
export type PointGroupsVariable = { groupsVariable: string };

export function isPointValuesVariable(
  variable: unknown,
): variable is PointValuesVariable {
  return (variable as PointValuesVariable).valuesVariable !== undefined;
}

export function isPointGroupsVariable(
  variable: unknown,
): variable is PointGroupsVariable {
  return (variable as PointGroupsVariable).groupsVariable !== undefined;
}

/** A named list of variables that can be used to jointly set multiple settings */
export interface PointsSettingsPreset {
  /** Human-readable preset name */
  name: string;

  /** List of variables  */
  variables: string[];

  /** True if the point color is set to the selected variable, False otherwise */
  setsColor: boolean;

  /** True if the point shape is set to the selected variable, False otherwise */
  setsShape: boolean;

  /** True if the point size is set to the selected variable, False otherwise */
  setsSize: boolean;

  /** True if the point visibility is set to the selected variable, False otherwise */
  setsVisibility: boolean;

  /** True if the point drawing order is set to the selected variable, False otherwise */
  setsZOrder: boolean;

  /** Target profile for updating the settings (when undefined, the settings are applied to the currently selected profile) */
  targetProfile?: string;
}

/** Settings applied to a specific subset of points resulting from a group-by operation  */
export interface PointsGroupSettings {
  /** Point color, or undefined if not specified for this group */
  color?: PointColor;

  /** Point shape, or undefined if not specified for this group */
  shape?: PointShape;

  /** Point size, or undefined if not specified for this group */
  size?: PointSize;

  /** Point visibility, or undefined if not specified for this group */
  visibility?: PointVisibility;

  /** Point drawing order, or undefined if not specified for this group */
  zorder?: PointZOrder;
}

/** A named set of point cloud settings */
export interface PointsSettingsProfile {
  /** Human-readable profile name */
  name: string;

  /** Point position (multiple sources possible for showing different aspects of data, e.g. spatial coordinates in one layer and UMAP coordinates in another) */
  pos: PointPosition[];

  /** Point color */
  color: PointColor | PointValuesVariable | PointGroupsVariable;

  /** Point shape */
  shape: PointShape | PointValuesVariable | PointGroupsVariable;

  /** Point size */
  size: PointSize | PointValuesVariable | PointGroupsVariable;

  /** Point visibility */
  visibility: PointVisibility | PointValuesVariable | PointGroupsVariable;

  /** Point drawing order  */
  zorder: PointZOrder | PointValuesVariable | PointGroupsVariable;

  /** Point group settings */
  groupSettings: {
    [groupsVariable: string]: { [group: string]: PointsGroupSettings };
  };
}

/** Point cloud settings */
export interface PointsSettings {
  /** Presets */
  presets: { [presetId: string]: PointsSettingsPreset };

  /** Profiles */
  profiles: { [profileId: string]: PointsSettingsProfile };

  /** ID of the active profile */
  activeProfileId: string;

  /** Selected groups variable */
  selectedGroupsVariable?: string;
}

/** A named collection of points (a.k.a. point cloud) */
export default interface Points {
  /** Human-readable point cloud name  */
  name: string;

  /** Data provider configuration */
  data: { type: string; config: PointsProviderConfig };

  /** Point cloud settings */
  settings: PointsSettings;
}

const DEFAULT_POINTS_SETTINGS_PROFILE_ID = "default";

export const defaultPointsSettingsPreset: PointsSettingsPreset = {
  name: "New preset",
  variables: [],
  setsColor: false,
  setsShape: false,
  setsSize: false,
  setsVisibility: false,
  setsZOrder: false,
};

export const defaultPointsSettingsProfile: PointsSettingsProfile = {
  name: "New Profile",
  pos: [{ x: { valuesVariable: "x" }, y: { valuesVariable: "y" } }],
  color: { r: 1, g: 1, b: 1 },
  shape: "circle", // TODO default points shape
  size: 5, // TODO default points size
  visibility: true,
  zorder: 0, // TODO default points zorder
  groupSettings: {},
};

export const defaultPointsSettings: PointsSettings = {
  presets: {},
  profiles: {
    DEFAULT_POINTS_SETTINGS_PROFILE_ID: { ...defaultPointsSettingsProfile },
  },
  activeProfileId: DEFAULT_POINTS_SETTINGS_PROFILE_ID,
};

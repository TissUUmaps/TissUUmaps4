export const LabelsSettingsCategory = {
  general: "general",
  labelColor: "labelColor",
  labelVisibility: "labelVisibility",
  labelOpacity: "labelOpacity",
};

export type LabelsSettingsCategory =
  (typeof LabelsSettingsCategory)[keyof typeof LabelsSettingsCategory];

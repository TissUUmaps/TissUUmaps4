export const LayerSettingsCategory = {
  general: "general",
  transform: "transform",
};

export type LayerSettingsCategory =
  (typeof LayerSettingsCategory)[keyof typeof LayerSettingsCategory];

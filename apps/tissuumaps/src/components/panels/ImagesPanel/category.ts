export const ImageSettingsCategory = {
  general: "general",
  transform: "transform",
  channels: "channels",
};

export type ImageSettingsCategory =
  (typeof ImageSettingsCategory)[keyof typeof ImageSettingsCategory];

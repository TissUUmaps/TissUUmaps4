export const PointsSettingsCategory = {
  general: "general",
  pointMarker: "pointMarker",
  pointSize: "pointSize",
  pointColor: "pointColor",
  pointVisibility: "pointVisibility",
  pointOpacity: "pointOpacity",
};

export type PointsSettingsCategory =
  (typeof PointsSettingsCategory)[keyof typeof PointsSettingsCategory];

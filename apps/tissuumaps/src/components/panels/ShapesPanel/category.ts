export const ShapesSettingsCategory = {
  general: "general",
  transform: "transform",
  shapeFillColor: "shapeFillColor",
  shapeFillVisibility: "shapeFillVisibility",
  shapeFillOpacity: "shapeFillOpacity",
  shapeStrokeColor: "shapeStrokeColor",
  shapeStrokeVisibility: "shapeStrokeVisibility",
  shapeStrokeOpacity: "shapeStrokeOpacity",
};

export type ShapesSettingsCategory =
  (typeof ShapesSettingsCategory)[keyof typeof ShapesSettingsCategory];

import { useMemo } from "react";

import {
  type Shapes,
  getActiveConfigSource,
  isGroupByConfig,
} from "@tissuumaps/core";

import { ShapesSettingsCategory } from "./category";

export function useShapesDataWidget(
  shapes: Shapes,
  selectedTable: string | null,
  selectedGroupByColumn: string | null,
  activeSettingsCategory: ShapesSettingsCategory | null,
) {
  const [synced, syncedTable, syncedGroupByColumn] = useMemo(() => {
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeFillColor &&
      getActiveConfigSource(shapes.shapeFillColor) === "groupBy" &&
      isGroupByConfig(shapes.shapeFillColor)
    ) {
      return [
        true,
        shapes.shapeFillColor.groupBy.table,
        shapes.shapeFillColor.groupBy.column,
      ];
    }
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeFillVisibility &&
      getActiveConfigSource(shapes.shapeFillVisibility) === "groupBy" &&
      isGroupByConfig(shapes.shapeFillVisibility)
    ) {
      return [
        true,
        shapes.shapeFillVisibility.groupBy.table,
        shapes.shapeFillVisibility.groupBy.column,
      ];
    }
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeFillOpacity &&
      getActiveConfigSource(shapes.shapeFillOpacity) === "groupBy" &&
      isGroupByConfig(shapes.shapeFillOpacity)
    ) {
      return [
        true,
        shapes.shapeFillOpacity.groupBy.table,
        shapes.shapeFillOpacity.groupBy.column,
      ];
    }
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeStrokeColor &&
      getActiveConfigSource(shapes.shapeStrokeColor) === "groupBy" &&
      isGroupByConfig(shapes.shapeStrokeColor)
    ) {
      return [
        true,
        shapes.shapeStrokeColor.groupBy.table,
        shapes.shapeStrokeColor.groupBy.column,
      ];
    }
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeStrokeVisibility &&
      getActiveConfigSource(shapes.shapeStrokeVisibility) === "groupBy" &&
      isGroupByConfig(shapes.shapeStrokeVisibility)
    ) {
      return [
        true,
        shapes.shapeStrokeVisibility.groupBy.table,
        shapes.shapeStrokeVisibility.groupBy.column,
      ];
    }
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeStrokeOpacity &&
      getActiveConfigSource(shapes.shapeStrokeOpacity) === "groupBy" &&
      isGroupByConfig(shapes.shapeStrokeOpacity)
    ) {
      return [
        true,
        shapes.shapeStrokeOpacity.groupBy.table,
        shapes.shapeStrokeOpacity.groupBy.column,
      ];
    }
    return [false, selectedTable, selectedGroupByColumn];
  }, [
    selectedTable,
    selectedGroupByColumn,
    activeSettingsCategory,
    shapes.shapeFillColor,
    shapes.shapeFillVisibility,
    shapes.shapeFillOpacity,
    shapes.shapeStrokeColor,
    shapes.shapeStrokeVisibility,
    shapes.shapeStrokeOpacity,
  ]);

  return { synced, syncedTable, syncedGroupByColumn };
}

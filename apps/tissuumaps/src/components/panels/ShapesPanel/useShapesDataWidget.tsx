import { useMemo, useState } from "react";

import {
  type Shapes,
  getActiveConfigSource,
  isGroupByConfig,
} from "@tissuumaps/core";

import { ShapesSettingsCategory } from "./category";

export function useShapesDataWidget(shapes: Shapes) {
  const [activeSettingsCategory, setActiveSettingsCategory] =
    useState<ShapesSettingsCategory | null>(null);
  const [selectedGroupByColumn, setSelectedGroupByColumn] = useState<
    string | null
  >(null);

  const activeGroupByColumn = useMemo(() => {
    if (shapes.dataSource.table !== undefined) {
      if (
        activeSettingsCategory === ShapesSettingsCategory.shapeFillColor &&
        getActiveConfigSource(shapes.shapeFillColor) === "groupBy" &&
        isGroupByConfig(shapes.shapeFillColor)
      ) {
        return shapes.shapeFillColor.groupBy.column;
      }
      if (
        activeSettingsCategory === ShapesSettingsCategory.shapeFillVisibility &&
        getActiveConfigSource(shapes.shapeFillVisibility) === "groupBy" &&
        isGroupByConfig(shapes.shapeFillVisibility)
      ) {
        return shapes.shapeFillVisibility.groupBy.column;
      }
      if (
        activeSettingsCategory === ShapesSettingsCategory.shapeFillOpacity &&
        getActiveConfigSource(shapes.shapeFillOpacity) === "groupBy" &&
        isGroupByConfig(shapes.shapeFillOpacity)
      ) {
        return shapes.shapeFillOpacity.groupBy.column;
      }
      if (
        activeSettingsCategory === ShapesSettingsCategory.shapeStrokeColor &&
        getActiveConfigSource(shapes.shapeStrokeColor) === "groupBy" &&
        isGroupByConfig(shapes.shapeStrokeColor)
      ) {
        return shapes.shapeStrokeColor.groupBy.column;
      }
      if (
        activeSettingsCategory ===
          ShapesSettingsCategory.shapeStrokeVisibility &&
        getActiveConfigSource(shapes.shapeStrokeVisibility) === "groupBy" &&
        isGroupByConfig(shapes.shapeStrokeVisibility)
      ) {
        return shapes.shapeStrokeVisibility.groupBy.column;
      }
      if (
        activeSettingsCategory === ShapesSettingsCategory.shapeStrokeOpacity &&
        getActiveConfigSource(shapes.shapeStrokeOpacity) === "groupBy" &&
        isGroupByConfig(shapes.shapeStrokeOpacity)
      ) {
        return shapes.shapeStrokeOpacity.groupBy.column;
      }
    }
    return null;
  }, [
    shapes.dataSource.table,
    activeSettingsCategory,
    shapes.shapeFillColor,
    shapes.shapeFillVisibility,
    shapes.shapeFillOpacity,
    shapes.shapeStrokeColor,
    shapes.shapeStrokeVisibility,
    shapes.shapeStrokeOpacity,
  ]);

  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevActiveGroupByColumn, setPrevActiveGroupByColumn] =
    useState(activeGroupByColumn);
  if (activeGroupByColumn !== prevActiveGroupByColumn) {
    setPrevActiveGroupByColumn(activeGroupByColumn);
    if (activeGroupByColumn !== null) {
      setSelectedGroupByColumn(activeGroupByColumn);
    }
  }

  return {
    activeSettingsCategory,
    setActiveSettingsCategory,
    selectedGroupByColumn,
    setSelectedGroupByColumn,
  };
}

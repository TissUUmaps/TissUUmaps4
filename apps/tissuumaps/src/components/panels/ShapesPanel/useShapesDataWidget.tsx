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
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedGroupByColumn, setSelectedGroupByColumn] = useState<
    string | null
  >(null);

  const [activeTable, activeGroupByColumn] = useMemo(() => {
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeFillColor &&
      getActiveConfigSource(shapes.shapeFillColor) === "groupBy" &&
      isGroupByConfig(shapes.shapeFillColor)
    ) {
      return [
        shapes.shapeFillColor.groupBy.table,
        shapes.shapeFillColor.groupBy.column,
      ] as const;
    }
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeFillVisibility &&
      getActiveConfigSource(shapes.shapeFillVisibility) === "groupBy" &&
      isGroupByConfig(shapes.shapeFillVisibility)
    ) {
      return [
        shapes.shapeFillVisibility.groupBy.table,
        shapes.shapeFillVisibility.groupBy.column,
      ] as const;
    }
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeFillOpacity &&
      getActiveConfigSource(shapes.shapeFillOpacity) === "groupBy" &&
      isGroupByConfig(shapes.shapeFillOpacity)
    ) {
      return [
        shapes.shapeFillOpacity.groupBy.table,
        shapes.shapeFillOpacity.groupBy.column,
      ] as const;
    }
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeStrokeColor &&
      getActiveConfigSource(shapes.shapeStrokeColor) === "groupBy" &&
      isGroupByConfig(shapes.shapeStrokeColor)
    ) {
      return [
        shapes.shapeStrokeColor.groupBy.table,
        shapes.shapeStrokeColor.groupBy.column,
      ] as const;
    }
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeStrokeVisibility &&
      getActiveConfigSource(shapes.shapeStrokeVisibility) === "groupBy" &&
      isGroupByConfig(shapes.shapeStrokeVisibility)
    ) {
      return [
        shapes.shapeStrokeVisibility.groupBy.table,
        shapes.shapeStrokeVisibility.groupBy.column,
      ] as const;
    }
    if (
      activeSettingsCategory === ShapesSettingsCategory.shapeStrokeOpacity &&
      getActiveConfigSource(shapes.shapeStrokeOpacity) === "groupBy" &&
      isGroupByConfig(shapes.shapeStrokeOpacity)
    ) {
      return [
        shapes.shapeStrokeOpacity.groupBy.table,
        shapes.shapeStrokeOpacity.groupBy.column,
      ] as const;
    }
    return [null, null] as const;
  }, [
    activeSettingsCategory,
    shapes.shapeFillColor,
    shapes.shapeFillVisibility,
    shapes.shapeFillOpacity,
    shapes.shapeStrokeColor,
    shapes.shapeStrokeVisibility,
    shapes.shapeStrokeOpacity,
  ]);

  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevActiveTable, setPrevActiveTable] = useState(activeTable);
  if (activeTable !== prevActiveTable) {
    setPrevActiveTable(activeTable);
    if (activeTable !== null) {
      setSelectedTable(activeTable);
    }
  }

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
    selectedTable,
    setSelectedTable,
    selectedGroupByColumn,
    setSelectedGroupByColumn,
  };
}

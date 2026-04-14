import { type ColumnDef } from "@tanstack/react-table";
import { EyeIcon, EyeOffIcon, Square } from "lucide-react";
import { useMemo } from "react";

import {
  type Color,
  type ColorPalette,
  HashUtils,
  type Shapes,
  colorPalettes,
  defaultShapeFillColor,
  defaultShapeFillOpacity,
  defaultShapeFillVisibility,
  defaultShapeStrokeColor,
  defaultShapeStrokeOpacity,
  defaultShapeStrokeVisibility,
  getActiveConfigSource,
  isGroupByConfig,
} from "@tissuumaps/core";

import { type ItemsDataTableGroupRowData } from "@/components/widgets/ItemsDataWidget/ItemsDataTable";
import { useTissUUmaps } from "@/store";

export function useShapesDataTableColumns(
  shapes: Shapes,
  currentTable: string | null,
  currentGroupByColumn: string | null,
) {
  const colorMaps = useTissUUmaps((state) => state.colorMaps);
  const visibilityMaps = useTissUUmaps((state) => state.visibilityMaps);
  const opacityMaps = useTissUUmaps((state) => state.opacityMaps);

  const extraTableGroupColumnDefs: ColumnDef<ItemsDataTableGroupRowData>[] =
    useMemo(() => {
      const columnDefs: ColumnDef<ItemsDataTableGroupRowData>[] = [];

      // fill color
      if (
        getActiveConfigSource(shapes.shapeFillColor) === "groupBy" &&
        isGroupByConfig(shapes.shapeFillColor) &&
        shapes.shapeFillColor.groupBy.table === currentTable &&
        shapes.shapeFillColor.groupBy.column === currentGroupByColumn
      ) {
        let groupFillColors: Map<string, Color> | undefined;
        const colorMapId = shapes.shapeFillColor.groupBy.map;
        if (colorMapId !== undefined) {
          const colorMap = colorMaps.find((map) => map.id === colorMapId);
          if (colorMap !== undefined) {
            groupFillColors = new Map(Object.entries(colorMap.values));
          }
        }
        let fillColorPalette: ColorPalette | undefined;
        const colorPaletteId = shapes.shapeFillColor.groupBy.palette;
        if (colorPaletteId !== undefined) {
          fillColorPalette = colorPalettes.find(
            (palette) => palette.id === colorPaletteId,
          );
        }
        columnDefs.push({
          id: "fillColor",
          size: 60,
          header: "fill",
          cell: ({ row }) => {
            const group = row.getValue<string>("group");
            let fillColor: Color | undefined;
            if (groupFillColors !== undefined) {
              fillColor = groupFillColors.get(group) ?? defaultShapeFillColor;
            } else if (fillColorPalette !== undefined) {
              fillColor = HashUtils.djb2Pick(fillColorPalette.colors, group);
            } else {
              fillColor = defaultShapeFillColor;
            }
            return (
              <Square
                fill={`rgb(${fillColor.r}, ${fillColor.g}, ${fillColor.b})`}
                className="size-4"
              />
            );
          },
        });
      }

      // fill visibility
      if (
        getActiveConfigSource(shapes.shapeFillVisibility) === "groupBy" &&
        isGroupByConfig(shapes.shapeFillVisibility) &&
        shapes.shapeFillVisibility.groupBy.table === currentTable &&
        shapes.shapeFillVisibility.groupBy.column === currentGroupByColumn
      ) {
        let groupFillVisibilities: Map<string, boolean> | undefined;
        const visibilityMapId = shapes.shapeFillVisibility.groupBy.map;
        if (visibilityMapId !== undefined) {
          const visibilityMap = visibilityMaps.find(
            (visibilityMap) => visibilityMap.id === visibilityMapId,
          );
          if (visibilityMap !== undefined) {
            groupFillVisibilities = new Map(
              Object.entries(visibilityMap.values),
            );
          }
        }
        columnDefs.push({
          id: "fillVisibility",
          size: 60,
          header: "visibility",
          cell: ({ row }) => {
            const group = row.getValue<string>("group");
            let fillVisibility: boolean | undefined;
            if (groupFillVisibilities !== undefined) {
              fillVisibility =
                groupFillVisibilities.get(group) ?? defaultShapeFillVisibility;
            } else {
              fillVisibility = defaultShapeFillVisibility;
            }
            return fillVisibility ? <EyeIcon /> : <EyeOffIcon />;
          },
        });
      }

      // fill opacity
      if (
        getActiveConfigSource(shapes.shapeFillOpacity) === "groupBy" &&
        isGroupByConfig(shapes.shapeFillOpacity) &&
        shapes.shapeFillOpacity.groupBy.table === currentTable &&
        shapes.shapeFillOpacity.groupBy.column === currentGroupByColumn
      ) {
        let groupFillOpacities: Map<string, number> | undefined;
        const opacityMapId = shapes.shapeFillOpacity.groupBy.map;
        if (opacityMapId !== undefined) {
          const opacityMap = opacityMaps.find(
            (opacityMap) => opacityMap.id === opacityMapId,
          );
          if (opacityMap !== undefined) {
            groupFillOpacities = new Map(Object.entries(opacityMap.values));
          }
        }
        columnDefs.push({
          id: "fillOpacity",
          size: 60,
          header: "opacity",
          cell: ({ row }) => {
            const group = row.getValue<string>("group");
            let fillOpacity: number | undefined;
            if (groupFillOpacities !== undefined) {
              fillOpacity =
                groupFillOpacities.get(group) ?? defaultShapeFillOpacity;
            } else {
              fillOpacity = defaultShapeFillOpacity;
            }
            return fillOpacity;
          },
        });
      }

      // stroke color
      if (
        getActiveConfigSource(shapes.shapeStrokeColor) === "groupBy" &&
        isGroupByConfig(shapes.shapeStrokeColor) &&
        shapes.shapeStrokeColor.groupBy.table === currentTable &&
        shapes.shapeStrokeColor.groupBy.column === currentGroupByColumn
      ) {
        let groupStrokeColors: Map<string, Color> | undefined;
        const colorMapId = shapes.shapeStrokeColor.groupBy.map;
        if (colorMapId !== undefined) {
          const colorMap = colorMaps.find(
            (strokeColorMap) => strokeColorMap.id === colorMapId,
          );
          if (colorMap !== undefined) {
            groupStrokeColors = new Map(Object.entries(colorMap.values));
          }
        }
        let strokeColorPalette: ColorPalette | undefined;
        const colorPaletteId = shapes.shapeStrokeColor.groupBy.palette;
        if (colorPaletteId !== undefined) {
          strokeColorPalette = colorPalettes.find(
            (palette) => palette.id === colorPaletteId,
          );
        }
        columnDefs.push({
          id: "strokeColor",
          size: 60,
          header: "outline",
          cell: ({ row }) => {
            const group = row.getValue<string>("group");
            let strokeColor: Color | undefined;
            if (groupStrokeColors !== undefined) {
              strokeColor =
                groupStrokeColors.get(group) ?? defaultShapeStrokeColor;
            } else if (strokeColorPalette !== undefined) {
              strokeColor = HashUtils.djb2Pick(
                strokeColorPalette.colors,
                group,
              );
            } else {
              strokeColor = defaultShapeStrokeColor;
            }
            return (
              <Square
                fill={`rgb(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b})`}
                className="size-4"
              />
            );
          },
        });
      }

      // stroke visibility
      if (
        getActiveConfigSource(shapes.shapeStrokeVisibility) === "groupBy" &&
        isGroupByConfig(shapes.shapeStrokeVisibility) &&
        shapes.shapeStrokeVisibility.groupBy.table === currentTable &&
        shapes.shapeStrokeVisibility.groupBy.column === currentGroupByColumn
      ) {
        let groupStrokeVisibilities: Map<string, boolean> | undefined;
        const visibilityMapId = shapes.shapeStrokeVisibility.groupBy.map;
        if (visibilityMapId !== undefined) {
          const visibilityMap = visibilityMaps.find(
            (visibilityMap) => visibilityMap.id === visibilityMapId,
          );
          if (visibilityMap !== undefined) {
            groupStrokeVisibilities = new Map(
              Object.entries(visibilityMap.values),
            );
          }
        }
        columnDefs.push({
          id: "strokeVisibility",
          size: 60,
          header: "visibility",
          cell: ({ row }) => {
            const group = row.getValue<string>("group");
            let strokeVisibility: boolean | undefined;
            if (groupStrokeVisibilities !== undefined) {
              strokeVisibility =
                groupStrokeVisibilities.get(group) ??
                defaultShapeStrokeVisibility;
            } else {
              strokeVisibility = defaultShapeStrokeVisibility;
            }
            return strokeVisibility ? <EyeIcon /> : <EyeOffIcon />;
          },
        });
      }

      // stroke opacity
      if (
        getActiveConfigSource(shapes.shapeStrokeOpacity) === "groupBy" &&
        isGroupByConfig(shapes.shapeStrokeOpacity) &&
        shapes.shapeStrokeOpacity.groupBy.table === currentTable &&
        shapes.shapeStrokeOpacity.groupBy.column === currentGroupByColumn
      ) {
        let groupStrokeOpacities: Map<string, number> | undefined;
        const opacityMapId = shapes.shapeStrokeOpacity.groupBy.map;
        if (opacityMapId !== undefined) {
          const opacityMap = opacityMaps.find(
            (opacityMap) => opacityMap.id === opacityMapId,
          );
          if (opacityMap !== undefined) {
            groupStrokeOpacities = new Map(Object.entries(opacityMap.values));
          }
        }
        columnDefs.push({
          id: "strokeOpacity",
          size: 60,
          header: "opacity",
          cell: ({ row }) => {
            const group = row.getValue<string>("group");
            let strokeOpacity: number | undefined;
            if (groupStrokeOpacities !== undefined) {
              strokeOpacity =
                groupStrokeOpacities.get(group) ?? defaultShapeStrokeOpacity;
            } else {
              strokeOpacity = defaultShapeStrokeOpacity;
            }
            return strokeOpacity;
          },
        });
      }

      return columnDefs;
    }, [
      currentTable,
      currentGroupByColumn,
      colorMaps,
      visibilityMaps,
      opacityMaps,
      shapes.shapeFillColor,
      shapes.shapeFillVisibility,
      shapes.shapeFillOpacity,
      shapes.shapeStrokeColor,
      shapes.shapeStrokeVisibility,
      shapes.shapeStrokeOpacity,
    ]);

  return { extraTableGroupColumnDefs };
}

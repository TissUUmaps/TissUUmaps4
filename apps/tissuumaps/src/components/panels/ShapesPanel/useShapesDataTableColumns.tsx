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

import { type ItemsDataTableRowData } from "@/components/widgets/ItemsDataWidget/ItemsDataTable";
import { useTissUUmaps } from "@/store";

export function useShapesDataTableColumns(
  shapes: Shapes,
  currentTable: string | null,
  currentGroupByColumn: string | null,
) {
  const colorMaps = useTissUUmaps((state) => state.colorMaps);
  const visibilityMaps = useTissUUmaps((state) => state.visibilityMaps);
  const opacityMaps = useTissUUmaps((state) => state.opacityMaps);

  const extraTableColumnDefs: ColumnDef<ItemsDataTableRowData>[] =
    useMemo(() => {
      let isFillColorGroup = false;
      let groupFillColors: Map<string, Color> | undefined;
      let fillColorPalette: ColorPalette | undefined;
      if (
        getActiveConfigSource(shapes.shapeFillColor) === "groupBy" &&
        isGroupByConfig(shapes.shapeFillColor) &&
        shapes.shapeFillColor.groupBy.table === currentTable &&
        shapes.shapeFillColor.groupBy.column === currentGroupByColumn
      ) {
        isFillColorGroup = true;
        const colorMapId = shapes.shapeFillColor.groupBy.map;
        if (colorMapId !== undefined) {
          const colorMap = colorMaps.find((map) => map.id === colorMapId);
          if (colorMap !== undefined) {
            groupFillColors = new Map(Object.entries(colorMap.values));
          }
        }
        const colorPaletteId = shapes.shapeFillColor.groupBy.palette;
        if (colorPaletteId !== undefined) {
          fillColorPalette = colorPalettes.find(
            (palette) => palette.id === colorPaletteId,
          );
        }
      }

      let isFillVisibilityGroup = false;
      let groupFillVisibilities: Map<string, boolean> | undefined;
      if (
        getActiveConfigSource(shapes.shapeFillVisibility) === "groupBy" &&
        isGroupByConfig(shapes.shapeFillVisibility) &&
        shapes.shapeFillVisibility.groupBy.table === currentTable &&
        shapes.shapeFillVisibility.groupBy.column === currentGroupByColumn
      ) {
        isFillVisibilityGroup = true;
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
      }

      let isFillOpacityGroup = false;
      let groupFillOpacities: Map<string, number> | undefined;
      if (
        getActiveConfigSource(shapes.shapeFillOpacity) === "groupBy" &&
        isGroupByConfig(shapes.shapeFillOpacity) &&
        shapes.shapeFillOpacity.groupBy.table === currentTable &&
        shapes.shapeFillOpacity.groupBy.column === currentGroupByColumn
      ) {
        isFillOpacityGroup = true;
        const opacityMapId = shapes.shapeFillOpacity.groupBy.map;
        if (opacityMapId !== undefined) {
          const opacityMap = opacityMaps.find(
            (opacityMap) => opacityMap.id === opacityMapId,
          );
          if (opacityMap !== undefined) {
            groupFillOpacities = new Map(Object.entries(opacityMap.values));
          }
        }
      }

      let isStrokeColorGroup = false;
      let groupStrokeColors: Map<string, Color> | undefined;
      let strokeColorPalette: ColorPalette | undefined;
      if (
        getActiveConfigSource(shapes.shapeStrokeColor) === "groupBy" &&
        isGroupByConfig(shapes.shapeStrokeColor) &&
        shapes.shapeStrokeColor.groupBy.table === currentTable &&
        shapes.shapeStrokeColor.groupBy.column === currentGroupByColumn
      ) {
        isStrokeColorGroup = true;
        const colorMapId = shapes.shapeStrokeColor.groupBy.map;
        if (colorMapId !== undefined) {
          const colorMap = colorMaps.find(
            (strokeColorMap) => strokeColorMap.id === colorMapId,
          );
          if (colorMap !== undefined) {
            groupStrokeColors = new Map(Object.entries(colorMap.values));
          }
        }
        const colorPaletteId = shapes.shapeStrokeColor.groupBy.palette;
        if (colorPaletteId !== undefined) {
          strokeColorPalette = colorPalettes.find(
            (palette) => palette.id === colorPaletteId,
          );
        }
      }

      let isStrokeVisibilityGroup = false;
      let groupStrokeVisibilities: Map<string, boolean> | undefined;
      if (
        getActiveConfigSource(shapes.shapeStrokeVisibility) === "groupBy" &&
        isGroupByConfig(shapes.shapeStrokeVisibility) &&
        shapes.shapeStrokeVisibility.groupBy.table === currentTable &&
        shapes.shapeStrokeVisibility.groupBy.column === currentGroupByColumn
      ) {
        isStrokeVisibilityGroup = true;
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
      }

      let isStrokeOpacityGroup = false;
      let groupStrokeOpacities: Map<string, number> | undefined;
      if (
        getActiveConfigSource(shapes.shapeStrokeOpacity) === "groupBy" &&
        isGroupByConfig(shapes.shapeStrokeOpacity) &&
        shapes.shapeStrokeOpacity.groupBy.table === currentTable &&
        shapes.shapeStrokeOpacity.groupBy.column === currentGroupByColumn
      ) {
        isStrokeOpacityGroup = true;
        const opacityMapId = shapes.shapeStrokeOpacity.groupBy.map;
        if (opacityMapId !== undefined) {
          const opacityMap = opacityMaps.find(
            (opacityMap) => opacityMap.id === opacityMapId,
          );
          if (opacityMap !== undefined) {
            groupStrokeOpacities = new Map(Object.entries(opacityMap.values));
          }
        }
      }

      return [
        {
          id: "fillColor",
          header: "Fill Color",
          cell: () => null,
          aggregationFn: () => null,
          aggregatedCell: ({ row }) => {
            if (isFillColorGroup) {
              const group = row.getGroupingValue("group") as string | undefined;
              if (group !== undefined) {
                let fillColor: Color | undefined;
                if (groupFillColors !== undefined) {
                  fillColor =
                    groupFillColors.get(group) ?? defaultShapeFillColor;
                } else if (fillColorPalette !== undefined) {
                  fillColor = HashUtils.djb2Pick(
                    fillColorPalette.colors,
                    group,
                  );
                } else {
                  fillColor = defaultShapeFillColor;
                }
                return (
                  <Square
                    fill={`rgb(${fillColor.r}, ${fillColor.g}, ${fillColor.b})`}
                  />
                );
              }
            }
            return null;
          },
        },
        {
          id: "fillVisibility",
          header: "Fill Visibility",
          cell: () => null,
          aggregationFn: () => null,
          aggregatedCell: ({ row }) => {
            if (isFillVisibilityGroup) {
              const group = row.getGroupingValue("group") as string | undefined;
              if (group !== undefined) {
                let fillVisibility: boolean | undefined;
                if (groupFillVisibilities !== undefined) {
                  fillVisibility =
                    groupFillVisibilities.get(group) ??
                    defaultShapeFillVisibility;
                } else {
                  fillVisibility = defaultShapeFillVisibility;
                }
                return fillVisibility ? <EyeIcon /> : <EyeOffIcon />;
              }
            }
            return null;
          },
        },
        {
          id: "fillOpacity",
          header: "Fill Opacity",
          cell: () => null,
          aggregationFn: () => null,
          aggregatedCell: ({ row }) => {
            if (isFillOpacityGroup) {
              const group = row.getGroupingValue("group") as string | undefined;
              if (group !== undefined) {
                let fillOpacity: number | undefined;
                if (groupFillOpacities !== undefined) {
                  fillOpacity =
                    groupFillOpacities.get(group) ?? defaultShapeFillOpacity;
                } else {
                  fillOpacity = defaultShapeFillOpacity;
                }
                return fillOpacity;
              }
            }
            return null;
          },
        },
        {
          id: "strokeColor",
          header: "Stroke Color",
          cell: () => null,
          aggregationFn: () => null,
          aggregatedCell: ({ row }) => {
            if (isStrokeColorGroup) {
              const group = row.getGroupingValue("group") as string | undefined;
              if (group !== undefined) {
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
                  />
                );
              }
            }
            return null;
          },
        },
        {
          id: "strokeVisibility",
          header: "Stroke Visibility",
          cell: () => null,
          aggregationFn: () => null,
          aggregatedCell: ({ row }) => {
            if (isStrokeVisibilityGroup) {
              const group = row.getGroupingValue("group") as string | undefined;
              if (group !== undefined) {
                let strokeVisibility: boolean | undefined;
                if (groupStrokeVisibilities !== undefined) {
                  strokeVisibility =
                    groupStrokeVisibilities.get(group) ??
                    defaultShapeStrokeVisibility;
                } else {
                  strokeVisibility = defaultShapeStrokeVisibility;
                }
                return strokeVisibility ? <EyeIcon /> : <EyeOffIcon />;
              }
            }
            return null;
          },
        },
        {
          id: "strokeOpacity",
          header: "Stroke Opacity",
          cell: () => null,
          aggregationFn: () => null,
          aggregatedCell: ({ row }) => {
            if (isStrokeOpacityGroup) {
              const group = row.getGroupingValue("group") as string | undefined;
              if (group !== undefined) {
                let strokeOpacity: number | undefined;
                if (groupStrokeOpacities !== undefined) {
                  strokeOpacity =
                    groupStrokeOpacities.get(group) ??
                    defaultShapeStrokeOpacity;
                } else {
                  strokeOpacity = defaultShapeStrokeOpacity;
                }
                return strokeOpacity;
              }
            }
            return null;
          },
        },
      ];
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

  return { extraTableColumnDefs };
}

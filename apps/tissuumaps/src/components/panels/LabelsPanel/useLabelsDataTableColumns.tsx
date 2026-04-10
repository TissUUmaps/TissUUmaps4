import { type ColumnDef } from "@tanstack/react-table";
import { EyeIcon, EyeOffIcon, Square } from "lucide-react";
import { useMemo } from "react";

import {
  type Color,
  type ColorPalette,
  HashUtils,
  type Labels,
  colorPalettes,
  defaultLabelColor,
  defaultLabelOpacity,
  defaultLabelVisibility,
  getActiveConfigSource,
  isGroupByConfig,
} from "@tissuumaps/core";

import { type ItemsDataTableRowData } from "@/components/widgets/ItemsDataWidget/ItemsDataTable";
import { useTissUUmaps } from "@/store";

export function useLabelsDataTableColumns(
  labels: Labels,
  currentTable: string | null,
  currentGroupByColumn: string | null,
) {
  const colorMaps = useTissUUmaps((state) => state.colorMaps);
  const visibilityMaps = useTissUUmaps((state) => state.visibilityMaps);
  const opacityMaps = useTissUUmaps((state) => state.opacityMaps);

  const extraTableColumnDefs: ColumnDef<ItemsDataTableRowData>[] =
    useMemo(() => {
      let isColorGroup = false;
      let groupColors: Map<string, Color> | undefined;
      let colorPalette: ColorPalette | undefined;
      if (
        getActiveConfigSource(labels.labelColor) === "groupBy" &&
        isGroupByConfig(labels.labelColor) &&
        labels.labelColor.groupBy.table === currentTable &&
        labels.labelColor.groupBy.column === currentGroupByColumn
      ) {
        isColorGroup = true;
        const colorMapId = labels.labelColor.groupBy.map;
        if (colorMapId !== undefined) {
          const colorMap = colorMaps.find((map) => map.id === colorMapId);
          if (colorMap !== undefined) {
            groupColors = new Map(Object.entries(colorMap.values));
          }
        }
        const colorPaletteId = labels.labelColor.groupBy.palette;
        if (colorPaletteId !== undefined) {
          colorPalette = colorPalettes.find(
            (palette) => palette.id === colorPaletteId,
          );
        }
      }

      let isVisibilityGroup = false;
      let groupVisibilities: Map<string, boolean> | undefined;
      if (
        getActiveConfigSource(labels.labelVisibility) === "groupBy" &&
        isGroupByConfig(labels.labelVisibility) &&
        labels.labelVisibility.groupBy.table === currentTable &&
        labels.labelVisibility.groupBy.column === currentGroupByColumn
      ) {
        isVisibilityGroup = true;
        const visibilityMapId = labels.labelVisibility.groupBy.map;
        if (visibilityMapId !== undefined) {
          const visibilityMap = visibilityMaps.find(
            (map) => map.id === visibilityMapId,
          );
          if (visibilityMap !== undefined) {
            groupVisibilities = new Map(Object.entries(visibilityMap.values));
          }
        }
      }

      let isOpacityGroup = false;
      let groupOpacities: Map<string, number> | undefined;
      if (
        getActiveConfigSource(labels.labelOpacity) === "groupBy" &&
        isGroupByConfig(labels.labelOpacity) &&
        labels.labelOpacity.groupBy.table === currentTable &&
        labels.labelOpacity.groupBy.column === currentGroupByColumn
      ) {
        isOpacityGroup = true;
        const opacityMapId = labels.labelOpacity.groupBy.map;
        if (opacityMapId !== undefined) {
          const opacityMap = opacityMaps.find(
            (opacityMap) => opacityMap.id === opacityMapId,
          );
          if (opacityMap !== undefined) {
            groupOpacities = new Map(Object.entries(opacityMap.values));
          }
        }
      }

      return [
        {
          id: "color",
          header: "Color",
          cell: () => null,
          aggregationFn: () => null,
          aggregatedCell: ({ row }) => {
            if (isColorGroup) {
              const group = row.getGroupingValue("group") as string | undefined;
              if (group !== undefined) {
                let color: Color | undefined;
                if (groupColors !== undefined) {
                  color = groupColors.get(group) ?? defaultLabelColor;
                } else if (colorPalette !== undefined) {
                  color = HashUtils.djb2Pick(colorPalette.colors, group);
                } else {
                  color = defaultLabelColor;
                }
                return (
                  <Square fill={`rgb(${color.r}, ${color.g}, ${color.b})`} />
                );
              }
            }
            return null;
          },
        },
        {
          id: "visibility",
          header: "Visibility",
          cell: () => null,
          aggregationFn: () => null,
          aggregatedCell: ({ row }) => {
            if (isVisibilityGroup) {
              const group = row.getGroupingValue("group") as string | undefined;
              if (group !== undefined) {
                let visibility: boolean | undefined;
                if (groupVisibilities !== undefined) {
                  visibility =
                    groupVisibilities.get(group) ?? defaultLabelVisibility;
                } else {
                  visibility = defaultLabelVisibility;
                }
                return visibility ? <EyeIcon /> : <EyeOffIcon />;
              }
            }
            return null;
          },
        },
        {
          id: "opacity",
          header: "Opacity",
          cell: () => null,
          aggregationFn: () => null,
          aggregatedCell: ({ row }) => {
            if (isOpacityGroup) {
              const group = row.getGroupingValue("group") as string | undefined;
              if (group !== undefined) {
                let opacity: number | undefined;
                if (groupOpacities !== undefined) {
                  opacity = groupOpacities.get(group) ?? defaultLabelOpacity;
                } else {
                  opacity = defaultLabelOpacity;
                }
                return opacity;
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
      labels.labelColor,
      labels.labelVisibility,
      labels.labelOpacity,
    ]);

  return { extraTableColumnDefs };
}

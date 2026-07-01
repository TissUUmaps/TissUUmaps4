import type { ColumnDef } from "@tanstack/react-table";
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

import type { ItemsDataTableGroupRowData } from "@/components/widgets/ItemsDataWidget/ItemsDataTable";
import { useTissUUmaps } from "@/store";

export function useLabelsDataTableColumns(
  labels: Labels,
  currentTable: string | null,
  currentGroupByColumn: string | null,
) {
  const colorMaps = useTissUUmaps((state) => state.colorMaps);
  const visibilityMaps = useTissUUmaps((state) => state.visibilityMaps);
  const opacityMaps = useTissUUmaps((state) => state.opacityMaps);

  const extraTableGroupColumnDefs: ColumnDef<ItemsDataTableGroupRowData>[] =
    useMemo(() => {
      const columnDefs: ColumnDef<ItemsDataTableGroupRowData>[] = [];

      // color
      if (
        getActiveConfigSource(labels.labelColor) === "groupBy" &&
        isGroupByConfig(labels.labelColor) &&
        labels.dataSource.table === currentTable &&
        labels.labelColor.groupBy.column === currentGroupByColumn
      ) {
        let groupColors: Map<string, Color> | undefined;
        const colorMapId = labels.labelColor.groupBy.map;
        if (colorMapId !== undefined) {
          const colorMap = colorMaps.find((map) => map.id === colorMapId);
          if (colorMap !== undefined) {
            groupColors = new Map(Object.entries(colorMap.values));
          }
        }
        let colorPalette: ColorPalette | undefined;
        const colorPaletteId = labels.labelColor.groupBy.palette;
        if (colorPaletteId !== undefined) {
          colorPalette = colorPalettes.find(
            (palette) => palette.id === colorPaletteId,
          );
        }
        columnDefs.push({
          id: "color",
          size: 60,
          header: "color",
          cell: ({ row }) => {
            const group = row.getValue<string>("group");
            let color: Color | undefined;
            if (groupColors !== undefined) {
              color = groupColors.get(group) ?? defaultLabelColor;
            } else if (colorPalette !== undefined) {
              color = HashUtils.djb2Pick(colorPalette.colors, group);
            } else {
              color = defaultLabelColor;
            }
            return (
              <Square
                fill={`rgb(${color.r}, ${color.g}, ${color.b})`}
                className="size-4"
              />
            );
          },
        });
      }

      // visibility
      if (
        getActiveConfigSource(labels.labelVisibility) === "groupBy" &&
        isGroupByConfig(labels.labelVisibility) &&
        labels.dataSource.table === currentTable &&
        labels.labelVisibility.groupBy.column === currentGroupByColumn
      ) {
        let groupVisibilities: Map<string, boolean> | undefined;
        const visibilityMapId = labels.labelVisibility.groupBy.map;
        if (visibilityMapId !== undefined) {
          const visibilityMap = visibilityMaps.find(
            (map) => map.id === visibilityMapId,
          );
          if (visibilityMap !== undefined) {
            groupVisibilities = new Map(Object.entries(visibilityMap.values));
          }
        }
        columnDefs.push({
          id: "visibility",
          size: 60,
          header: "visibility",
          cell: ({ row }) => {
            const group = row.getValue<string>("group");
            let visibility: boolean | undefined;
            if (groupVisibilities !== undefined) {
              visibility =
                groupVisibilities.get(group) ?? defaultLabelVisibility;
            } else {
              visibility = defaultLabelVisibility;
            }
            return visibility ? <EyeIcon /> : <EyeOffIcon />;
          },
        });
      }

      // opacity
      if (
        getActiveConfigSource(labels.labelOpacity) === "groupBy" &&
        isGroupByConfig(labels.labelOpacity) &&
        labels.dataSource.table === currentTable &&
        labels.labelOpacity.groupBy.column === currentGroupByColumn
      ) {
        let groupOpacities: Map<string, number> | undefined;
        const opacityMapId = labels.labelOpacity.groupBy.map;
        if (opacityMapId !== undefined) {
          const opacityMap = opacityMaps.find(
            (opacityMap) => opacityMap.id === opacityMapId,
          );
          if (opacityMap !== undefined) {
            groupOpacities = new Map(Object.entries(opacityMap.values));
          }
        }
        columnDefs.push({
          id: "opacity",
          size: 60,
          header: "opacity",
          cell: ({ row }) => {
            const group = row.getValue<string>("group");
            let opacity: number | undefined;
            if (groupOpacities !== undefined) {
              opacity = groupOpacities.get(group) ?? defaultLabelOpacity;
            } else {
              opacity = defaultLabelOpacity;
            }
            return opacity;
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
      labels.labelColor,
      labels.labelVisibility,
      labels.labelOpacity,
      labels.dataSource.table,
    ]);

  return { extraTableGroupColumnDefs };
}

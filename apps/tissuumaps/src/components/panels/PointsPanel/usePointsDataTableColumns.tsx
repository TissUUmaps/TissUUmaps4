import type { ColumnDef } from "@tanstack/react-table";
import { EyeIcon, EyeOffIcon, Square } from "lucide-react";
import { useMemo } from "react";

import {
  type Color,
  type ColorPalette,
  HashUtils,
  type Marker,
  type Points,
  colorPalettes,
  defaultPointColor,
  defaultPointMarker,
  defaultPointOpacity,
  defaultPointSize,
  defaultPointVisibility,
  getActiveConfigSource,
  isGroupByConfig,
  markerPalette,
} from "@tissuumaps/core";

import { markers } from "@/components/markers";
import type { ItemsDataTableGroupRowData } from "@/components/widgets/ItemsDataWidget/ItemsDataTable";
import { useProjectStore } from "@/stores/project";

export function usePointsDataTableColumns(
  points: Points,
  currentTable: string | null,
  currentGroupByColumn: string | null,
) {
  const markerMaps = useProjectStore((state) => state.markerMaps);
  const sizeMaps = useProjectStore((state) => state.sizeMaps);
  const colorMaps = useProjectStore((state) => state.colorMaps);
  const visibilityMaps = useProjectStore((state) => state.visibilityMaps);
  const opacityMaps = useProjectStore((state) => state.opacityMaps);

  const extraTableGroupColumnDefs: ColumnDef<ItemsDataTableGroupRowData>[] =
    useMemo(() => {
      const columnDefs: ColumnDef<ItemsDataTableGroupRowData>[] = [];

      // marker
      if (
        getActiveConfigSource(points.pointMarker) === "groupBy" &&
        isGroupByConfig(points.pointMarker) &&
        points.dataSource.table === currentTable &&
        points.pointMarker.groupBy.column === currentGroupByColumn
      ) {
        let groupMarkers: Map<string, Marker> | undefined;
        const markerMapId = points.pointMarker.groupBy.map;
        if (markerMapId !== undefined) {
          const markerMap = markerMaps.find((map) => map.id === markerMapId);
          if (markerMap !== undefined) {
            groupMarkers = new Map(Object.entries(markerMap.values));
          }
        }
        columnDefs.push({
          id: "marker",
          size: 60,
          header: "marker",
          cell: ({ row }) => {
            const group = row.getValue<string>("group");
            let marker: Marker | undefined;
            if (groupMarkers !== undefined) {
              marker = groupMarkers.get(group) ?? defaultPointMarker;
            } else {
              marker = HashUtils.djb2Pick(markerPalette, group);
            }
            return markers.find((m) => m.value === marker)!.icon;
          },
        });
      }

      // size
      if (
        getActiveConfigSource(points.pointSize) === "groupBy" &&
        isGroupByConfig(points.pointSize) &&
        points.dataSource.table === currentTable &&
        points.pointSize.groupBy.column === currentGroupByColumn
      ) {
        let groupSizes: Map<string, number> | undefined;
        const sizeMapId = points.pointSize.groupBy.map;
        if (sizeMapId !== undefined) {
          const sizeMap = sizeMaps.find((map) => map.id === sizeMapId);
          if (sizeMap !== undefined) {
            groupSizes = new Map(Object.entries(sizeMap.values));
          }
        }
        columnDefs.push({
          id: "size",
          size: 60,
          header: "size",
          cell: ({ row }) => {
            const group = row.getValue<string>("group");
            let size: number | undefined;
            if (groupSizes !== undefined) {
              size = groupSizes.get(group) ?? defaultPointSize;
            } else {
              size = defaultPointSize;
            }
            return size;
          },
        });
      }

      // color
      if (
        getActiveConfigSource(points.pointColor) === "groupBy" &&
        isGroupByConfig(points.pointColor) &&
        points.dataSource.table === currentTable &&
        points.pointColor.groupBy.column === currentGroupByColumn
      ) {
        let groupColors: Map<string, Color> | undefined;
        const colorMapId = points.pointColor.groupBy.map;
        if (colorMapId !== undefined) {
          const colorMap = colorMaps.find(
            (colorMap) => colorMap.id === colorMapId,
          );
          if (colorMap !== undefined) {
            groupColors = new Map(Object.entries(colorMap.values));
          }
        }
        let colorPalette: ColorPalette | undefined;
        const colorPaletteId = points.pointColor.groupBy.palette;
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
              color = groupColors.get(group) ?? defaultPointColor;
            } else if (colorPalette !== undefined) {
              color = HashUtils.djb2Pick(colorPalette.colors, group);
            } else {
              color = defaultPointColor;
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
        getActiveConfigSource(points.pointVisibility) === "groupBy" &&
        isGroupByConfig(points.pointVisibility) &&
        points.dataSource.table === currentTable &&
        points.pointVisibility.groupBy.column === currentGroupByColumn
      ) {
        let groupVisibilities: Map<string, boolean> | undefined;
        const visibilityMapId = points.pointVisibility.groupBy.map;
        if (visibilityMapId !== undefined) {
          const visibilityMap = visibilityMaps.find(
            (visibilityMap) => visibilityMap.id === visibilityMapId,
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
                groupVisibilities.get(group) ?? defaultPointVisibility;
            } else {
              visibility = defaultPointVisibility;
            }
            return visibility ? <EyeIcon /> : <EyeOffIcon />;
          },
        });
      }

      // opacity
      if (
        getActiveConfigSource(points.pointOpacity) === "groupBy" &&
        isGroupByConfig(points.pointOpacity) &&
        points.dataSource.table === currentTable &&
        points.pointOpacity.groupBy.column === currentGroupByColumn
      ) {
        let groupOpacities: Map<string, number> | undefined;
        const opacityMapId = points.pointOpacity.groupBy.map;
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
              opacity = groupOpacities.get(group) ?? defaultPointOpacity;
            } else {
              opacity = defaultPointOpacity;
            }
            return opacity;
          },
        });
      }

      return columnDefs;
    }, [
      currentTable,
      currentGroupByColumn,
      markerMaps,
      sizeMaps,
      colorMaps,
      visibilityMaps,
      opacityMaps,
      points.pointMarker,
      points.pointSize,
      points.pointColor,
      points.pointVisibility,
      points.pointOpacity,
      points.dataSource.table,
    ]);

  return { extraTableGroupColumnDefs };
}

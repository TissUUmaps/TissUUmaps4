import { type ColumnDef } from "@tanstack/react-table";
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
import { type ItemsDataTableRowData } from "@/components/widgets/ItemsDataWidget/ItemsDataTable";
import { useTissUUmaps } from "@/store";

export function usePointsDataTableColumns(
  points: Points,
  currentTable: string | null,
  currentGroupByColumn: string | null,
) {
  const markerMaps = useTissUUmaps((state) => state.markerMaps);
  const sizeMaps = useTissUUmaps((state) => state.sizeMaps);
  const colorMaps = useTissUUmaps((state) => state.colorMaps);
  const visibilityMaps = useTissUUmaps((state) => state.visibilityMaps);
  const opacityMaps = useTissUUmaps((state) => state.opacityMaps);

  const extraTableColumnDefs: ColumnDef<ItemsDataTableRowData>[] =
    useMemo(() => {
      let isMarkerGroup = false;
      let groupMarkers: Map<string, Marker> | undefined;
      if (
        getActiveConfigSource(points.pointMarker) === "groupBy" &&
        isGroupByConfig(points.pointMarker) &&
        points.pointMarker.groupBy.table === currentTable &&
        points.pointMarker.groupBy.column === currentGroupByColumn
      ) {
        isMarkerGroup = true;
        const markerMapId = points.pointMarker.groupBy.map;
        if (markerMapId !== undefined) {
          const markerMap = markerMaps.find((map) => map.id === markerMapId);
          if (markerMap !== undefined) {
            groupMarkers = new Map(Object.entries(markerMap.values));
          }
        }
      }

      let isSizeGroup = false;
      let groupSizes: Map<string, number> | undefined;
      if (
        getActiveConfigSource(points.pointSize) === "groupBy" &&
        isGroupByConfig(points.pointSize) &&
        points.pointSize.groupBy.table === currentTable &&
        points.pointSize.groupBy.column === currentGroupByColumn
      ) {
        isSizeGroup = true;
        const sizeMapId = points.pointSize.groupBy.map;
        if (sizeMapId !== undefined) {
          const sizeMap = sizeMaps.find((map) => map.id === sizeMapId);
          if (sizeMap !== undefined) {
            groupSizes = new Map(Object.entries(sizeMap.values));
          }
        }
      }

      let isColorGroup = false;
      let groupColors: Map<string, Color> | undefined;
      let colorPalette: ColorPalette | undefined;
      if (
        getActiveConfigSource(points.pointColor) === "groupBy" &&
        isGroupByConfig(points.pointColor) &&
        points.pointColor.groupBy.table === currentTable &&
        points.pointColor.groupBy.column === currentGroupByColumn
      ) {
        isColorGroup = true;
        const colorMapId = points.pointColor.groupBy.map;
        if (colorMapId !== undefined) {
          const colorMap = colorMaps.find(
            (colorMap) => colorMap.id === colorMapId,
          );
          if (colorMap !== undefined) {
            groupColors = new Map(Object.entries(colorMap.values));
          }
        }
        const colorPaletteId = points.pointColor.groupBy.palette;
        if (colorPaletteId !== undefined) {
          colorPalette = colorPalettes.find(
            (palette) => palette.id === colorPaletteId,
          );
        }
      }

      let isVisibilityGroup = false;
      let groupVisibilities: Map<string, boolean> | undefined;
      if (
        getActiveConfigSource(points.pointVisibility) === "groupBy" &&
        isGroupByConfig(points.pointVisibility) &&
        points.pointVisibility.groupBy.table === currentTable &&
        points.pointVisibility.groupBy.column === currentGroupByColumn
      ) {
        isVisibilityGroup = true;
        const visibilityMapId = points.pointVisibility.groupBy.map;
        if (visibilityMapId !== undefined) {
          const visibilityMap = visibilityMaps.find(
            (visibilityMap) => visibilityMap.id === visibilityMapId,
          );
          if (visibilityMap !== undefined) {
            groupVisibilities = new Map(Object.entries(visibilityMap.values));
          }
        }
      }

      let isOpacityGroup = false;
      let groupOpacities: Map<string, number> | undefined;
      if (
        getActiveConfigSource(points.pointOpacity) === "groupBy" &&
        isGroupByConfig(points.pointOpacity) &&
        points.pointOpacity.groupBy.table === currentTable &&
        points.pointOpacity.groupBy.column === currentGroupByColumn
      ) {
        isOpacityGroup = true;
        const opacityMapId = points.pointOpacity.groupBy.map;
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
          id: "marker",
          header: "Marker",
          cell: () => null,
          aggregationFn: () => null,
          aggregatedCell: ({ row }) => {
            if (isMarkerGroup) {
              const group = row.getGroupingValue("group") as string | undefined;
              if (group !== undefined) {
                let marker: Marker | undefined;
                if (groupMarkers !== undefined) {
                  marker = groupMarkers.get(group) ?? defaultPointMarker;
                } else {
                  marker = HashUtils.djb2Pick(markerPalette, group);
                }
                return markers.find((m) => m.value === marker)!.icon;
              }
            }
            return null;
          },
        },
        {
          id: "size",
          header: "Size",
          cell: () => null,
          aggregationFn: () => null,
          aggregatedCell: ({ row }) => {
            if (isSizeGroup) {
              const group = row.getGroupingValue("group") as string | undefined;
              if (group !== undefined) {
                let size: number | undefined;
                if (groupSizes !== undefined) {
                  size = groupSizes.get(group) ?? defaultPointSize;
                } else {
                  size = defaultPointSize;
                }
                return size;
              }
            }
            return null;
          },
        },
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
                  color = groupColors.get(group) ?? defaultPointColor;
                } else if (colorPalette !== undefined) {
                  color = HashUtils.djb2Pick(colorPalette.colors, group);
                } else {
                  color = defaultPointColor;
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
                    groupVisibilities.get(group) ?? defaultPointVisibility;
                } else {
                  visibility = defaultPointVisibility;
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
                  opacity = groupOpacities.get(group) ?? defaultPointOpacity;
                } else {
                  opacity = defaultPointOpacity;
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
    ]);

  return { extraTableColumnDefs };
}

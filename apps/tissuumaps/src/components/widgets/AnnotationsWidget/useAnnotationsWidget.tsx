import { EyeIcon, EyeOffIcon, Square } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import {
  type Color,
  type ColorConfig,
  type Config,
  type GroupByConfig,
  type Marker,
  type MarkerConfig,
  type OpacityConfig,
  type SizeConfig,
  type VisibilityConfig,
  createGroupValueGetter,
  findColorPalette,
  getActiveConfigSource,
  isGroupByConfig,
  markerPalette,
} from "@tissuumaps/core";

import { markers } from "@/components/markers";
import { useProjectStore } from "@/stores/project";

import type { GroupAnnotationsTableColumnDef } from "./GroupAnnotationsTable";

/**
 * A property of an annotated object that the group table shows
 *
 * The property is shown while its configuration groups by the selected column.
 */
export type GroupProperty = {
  /** The settings category of the property */
  category: string;

  /** The name of the property, as a column header */
  name: string;
} & (
  | { kind: "marker"; default: Marker; config: MarkerConfig }
  | { kind: "size"; default: number; config: SizeConfig }
  | { kind: "color"; default: Color; config: ColorConfig }
  | { kind: "visibility"; default: boolean; config: VisibilityConfig }
  | { kind: "opacity"; default: number; config: OpacityConfig }
);

/** Width of a group column, in pixels */
const groupColumnSize = 60;

function isGroupedByColumn<TConfig extends Config<string>>(
  config: TConfig,
  column: string,
): config is Extract<TConfig, GroupByConfig<false>> {
  return (
    getActiveConfigSource(config) === "groupBy" &&
    isGroupByConfig(config) &&
    config.groupBy.column === column
  );
}

export function useAnnotationsWidget(
  table: string | null,
  groupProperties: GroupProperty[],
  activeSettingsCategory: string | null,
) {
  const markerMaps = useProjectStore((state) => state.markerMaps);
  const sizeMaps = useProjectStore((state) => state.sizeMaps);
  const colorMaps = useProjectStore((state) => state.colorMaps);
  const visibilityMaps = useProjectStore((state) => state.visibilityMaps);
  const opacityMaps = useProjectStore((state) => state.opacityMaps);

  const activeConfig = groupProperties.find(
    (property) => property.category === activeSettingsCategory,
  )?.config;
  const activeGroupByColumn =
    table !== null &&
    activeConfig !== undefined &&
    getActiveConfigSource(activeConfig) === "groupBy" &&
    isGroupByConfig(activeConfig)
      ? activeConfig.groupBy.column
      : null;

  const [selectedGroupByColumn, setSelectedGroupByColumn] = useState<
    string | null
  >(null);

  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevActiveGroupByColumn, setPrevActiveGroupByColumn] =
    useState(activeGroupByColumn);
  if (activeGroupByColumn !== prevActiveGroupByColumn) {
    setPrevActiveGroupByColumn(activeGroupByColumn);
    if (activeGroupByColumn !== null) {
      setSelectedGroupByColumn(activeGroupByColumn);
    }
  }

  const extraGroupColumnDefs = useMemo(() => {
    const column = selectedGroupByColumn;
    const columnDefs: GroupAnnotationsTableColumnDef[] = [];
    if (column === null) {
      return columnDefs;
    }
    for (const property of groupProperties) {
      let renderGroup: (group: string) => ReactNode;
      switch (property.kind) {
        case "marker": {
          if (!isGroupedByColumn(property.config, column)) {
            continue;
          }
          const getMarker = createGroupValueGetter(
            property.config,
            markerMaps,
            property.default,
            markerPalette,
          );
          renderGroup = (group) =>
            markers.find((m) => m.value === getMarker(group))!.icon;
          break;
        }
        case "size": {
          if (!isGroupedByColumn(property.config, column)) {
            continue;
          }
          renderGroup = createGroupValueGetter(
            property.config,
            sizeMaps,
            property.default,
          );
          break;
        }
        case "color": {
          if (!isGroupedByColumn(property.config, column)) {
            continue;
          }
          const getColor = createGroupValueGetter(
            property.config,
            colorMaps,
            property.default,
            findColorPalette(property.config.groupBy.palette)?.colors,
          );
          renderGroup = (group) => {
            const color = getColor(group);
            return (
              <Square
                fill={`rgb(${color.r}, ${color.g}, ${color.b})`}
                className="size-4"
              />
            );
          };
          break;
        }
        case "visibility": {
          if (!isGroupedByColumn(property.config, column)) {
            continue;
          }
          const isVisible = createGroupValueGetter(
            property.config,
            visibilityMaps,
            property.default,
          );
          renderGroup = (group) =>
            isVisible(group) ? <EyeIcon /> : <EyeOffIcon />;
          break;
        }
        case "opacity": {
          if (!isGroupedByColumn(property.config, column)) {
            continue;
          }
          renderGroup = createGroupValueGetter(
            property.config,
            opacityMaps,
            property.default,
          );
          break;
        }
      }
      columnDefs.push({
        id: property.name,
        size: groupColumnSize,
        header: property.name,
        cell: ({ row }) => renderGroup(row.getValue<string>("group")),
      });
    }
    return columnDefs;
  }, [
    groupProperties,
    selectedGroupByColumn,
    markerMaps,
    sizeMaps,
    colorMaps,
    visibilityMaps,
    opacityMaps,
  ]);

  return {
    selectedGroupByColumn,
    setSelectedGroupByColumn,
    extraGroupColumnDefs,
  };
}

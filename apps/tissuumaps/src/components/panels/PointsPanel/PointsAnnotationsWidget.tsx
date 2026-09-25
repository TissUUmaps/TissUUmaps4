import { useMemo } from "react";

import {
  type ItemsData,
  type Points,
  defaultPointColor,
  defaultPointMarker,
  defaultPointOpacity,
  defaultPointSize,
  defaultPointVisibility,
} from "@tissuumaps/core";

import { AnnotationsWidget } from "@/components/widgets/AnnotationsWidget";
import {
  type GroupProperty,
  useAnnotationsWidget,
} from "@/components/widgets/AnnotationsWidget/useAnnotationsWidget";

import { PointsSettingsCategory } from "./category";

export type PointsAnnotationsWidgetProps = {
  points: Points;
  data: ItemsData;
  activeSettingsCategory: PointsSettingsCategory | null;
  className?: string;
};

export function PointsAnnotationsWidget({
  points,
  data,
  activeSettingsCategory,
  className,
}: PointsAnnotationsWidgetProps) {
  const groupProperties = useMemo<GroupProperty[]>(
    () => [
      {
        kind: "marker",
        category: PointsSettingsCategory.pointMarker,
        name: "marker",
        default: defaultPointMarker,
        config: points.pointMarker,
      },
      {
        kind: "size",
        category: PointsSettingsCategory.pointSize,
        name: "size",
        default: defaultPointSize,
        config: points.pointSize,
      },
      {
        kind: "color",
        category: PointsSettingsCategory.pointColor,
        name: "color",
        default: defaultPointColor,
        config: points.pointColor,
      },
      {
        kind: "visibility",
        category: PointsSettingsCategory.pointVisibility,
        name: "visibility",
        default: defaultPointVisibility,
        config: points.pointVisibility,
      },
      {
        kind: "opacity",
        category: PointsSettingsCategory.pointOpacity,
        name: "opacity",
        default: defaultPointOpacity,
        config: points.pointOpacity,
      },
    ],
    [points],
  );

  const {
    selectedGroupByColumn,
    setSelectedGroupByColumn,
    extraGroupColumnDefs,
  } = useAnnotationsWidget(
    points.dataSource.table ?? null,
    groupProperties,
    activeSettingsCategory,
  );

  return (
    <AnnotationsWidget
      data={data}
      tableHeight={200}
      table={points.dataSource.table ?? null}
      selectedGroupByColumn={selectedGroupByColumn}
      onSelectedGroupByColumnChange={setSelectedGroupByColumn}
      extraGroupColumnDefs={extraGroupColumnDefs}
      className={className}
    />
  );
}

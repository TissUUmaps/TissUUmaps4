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
import { useColorGroupValues } from "@/components/widgets/AnnotationsWidget/useColorGroupValues";
import { useGroupColumn } from "@/components/widgets/AnnotationsWidget/useGroupColumn";
import { useGroupTable } from "@/components/widgets/AnnotationsWidget/useGroupTable";
import { useMarkerGroupValues } from "@/components/widgets/AnnotationsWidget/useMarkerGroupValues";
import { useOpacityGroupValues } from "@/components/widgets/AnnotationsWidget/useOpacityGroupValues";
import { useSizeGroupValues } from "@/components/widgets/AnnotationsWidget/useSizeGroupValues";
import { useVisibilityGroupValues } from "@/components/widgets/AnnotationsWidget/useVisibilityGroupValues";

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
  const tableId = points.dataSource.table ?? null;
  const table = useGroupTable(
    tableId,
    [
      {
        category: PointsSettingsCategory.pointMarker,
        config: points.pointMarker,
      },
      {
        category: PointsSettingsCategory.pointSize,
        config: points.pointSize,
      },
      {
        category: PointsSettingsCategory.pointColor,
        config: points.pointColor,
      },
      {
        category: PointsSettingsCategory.pointVisibility,
        config: points.pointVisibility,
      },
      {
        category: PointsSettingsCategory.pointOpacity,
        config: points.pointOpacity,
      },
    ],
    activeSettingsCategory,
  );

  const markerValues = useMarkerGroupValues();
  const sizeValues = useSizeGroupValues();
  const colorValues = useColorGroupValues();
  const visibilityValues = useVisibilityGroupValues();
  const opacityValues = useOpacityGroupValues();

  const markerColumn = useGroupColumn(table, {
    name: "marker",
    default: defaultPointMarker,
    config: points.pointMarker,
    values: markerValues,
  });
  const sizeColumn = useGroupColumn(table, {
    name: "size",
    default: defaultPointSize,
    config: points.pointSize,
    values: sizeValues,
  });
  const colorColumn = useGroupColumn(table, {
    name: "color",
    default: defaultPointColor,
    config: points.pointColor,
    values: colorValues,
  });
  const visibilityColumn = useGroupColumn(table, {
    name: "visibility",
    default: defaultPointVisibility,
    config: points.pointVisibility,
    values: visibilityValues,
  });
  const opacityColumn = useGroupColumn(table, {
    name: "opacity",
    default: defaultPointOpacity,
    config: points.pointOpacity,
    values: opacityValues,
  });

  const groupColumnDefs = useMemo(
    () =>
      [
        markerColumn,
        sizeColumn,
        colorColumn,
        visibilityColumn,
        opacityColumn,
      ].filter((columnDef) => columnDef !== undefined),
    [markerColumn, sizeColumn, colorColumn, visibilityColumn, opacityColumn],
  );

  return (
    <AnnotationsWidget
      data={data}
      tableHeight={200}
      table={tableId}
      selectedGroupByColumn={table.column}
      onSelectedGroupByColumnChange={table.setColumn}
      extraGroupColumnDefs={groupColumnDefs}
      className={className}
    />
  );
}

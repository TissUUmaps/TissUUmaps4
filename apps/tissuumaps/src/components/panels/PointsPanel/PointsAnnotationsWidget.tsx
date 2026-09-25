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
import { useGroupVisibility } from "@/components/widgets/AnnotationsWidget/useGroupVisibility";
import { useMarkerGroupValues } from "@/components/widgets/AnnotationsWidget/useMarkerGroupValues";
import { useOpacityGroupValues } from "@/components/widgets/AnnotationsWidget/useOpacityGroupValues";
import { useSizeGroupValues } from "@/components/widgets/AnnotationsWidget/useSizeGroupValues";
import { useVisibilityGroupValues } from "@/components/widgets/AnnotationsWidget/useVisibilityGroupValues";
import { useProjectStore } from "@/stores/project";

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
  const updatePoints = useProjectStore((state) => state.updatePoints);

  const tableId = points.dataSource.table ?? null;
  const groupTable = useGroupTable(
    points.name,
    tableId,
    [
      {
        category: PointsSettingsCategory.pointMarker,
        config: points.pointMarker,
      },
      { category: PointsSettingsCategory.pointSize, config: points.pointSize },
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

  const markerAdapter = useMarkerGroupValues();
  const sizeAdapter = useSizeGroupValues();
  const colorAdapter = useColorGroupValues();
  const visibilityAdapter = useVisibilityGroupValues();
  const opacityAdapter = useOpacityGroupValues();

  const groupVisibility = useGroupVisibility(groupTable, {
    category: PointsSettingsCategory.pointVisibility,
    name: "visibility",
    default: defaultPointVisibility,
    config: points.pointVisibility,
    onConfigChange: (pointVisibility) =>
      updatePoints(points.id, { pointVisibility }),
    adapter: visibilityAdapter,
  });
  const markerColumn = useGroupColumn(groupTable, {
    category: PointsSettingsCategory.pointMarker,
    name: "marker",
    shownByDefault: true,
    default: defaultPointMarker,
    config: points.pointMarker,
    onConfigChange: (pointMarker) => updatePoints(points.id, { pointMarker }),
    adapter: markerAdapter,
  });
  const sizeColumn = useGroupColumn(groupTable, {
    category: PointsSettingsCategory.pointSize,
    name: "size",
    default: defaultPointSize,
    config: points.pointSize,
    onConfigChange: (pointSize) => updatePoints(points.id, { pointSize }),
    adapter: sizeAdapter,
  });
  const colorColumn = useGroupColumn(groupTable, {
    category: PointsSettingsCategory.pointColor,
    name: "color",
    shownByDefault: true,
    default: defaultPointColor,
    config: points.pointColor,
    onConfigChange: (pointColor) => updatePoints(points.id, { pointColor }),
    adapter: colorAdapter,
  });
  const opacityColumn = useGroupColumn(groupTable, {
    category: PointsSettingsCategory.pointOpacity,
    name: "opacity",
    default: defaultPointOpacity,
    config: points.pointOpacity,
    onConfigChange: (pointOpacity) => updatePoints(points.id, { pointOpacity }),
    adapter: opacityAdapter,
  });

  const groupColumns = useMemo(
    () =>
      [markerColumn, sizeColumn, colorColumn, opacityColumn].filter(
        (column) => column !== undefined,
      ),
    [markerColumn, sizeColumn, colorColumn, opacityColumn],
  );

  return (
    <AnnotationsWidget
      data={data}
      tableHeight={300}
      tableId={tableId}
      selectedGroupByColumn={groupTable.column}
      onSelectedGroupByColumnChange={groupTable.setColumn}
      groupCounts={groupTable.groupCounts}
      groupVisibility={groupVisibility}
      groupColumns={groupColumns}
      className={className}
    />
  );
}

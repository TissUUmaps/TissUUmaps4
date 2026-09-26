import { useMemo } from "react";

import {
  type ItemsData,
  type Shapes,
  defaultShapeFillColor,
  defaultShapeFillOpacity,
  defaultShapeFillVisibility,
  defaultShapeStrokeColor,
  defaultShapeStrokeOpacity,
  defaultShapeStrokeVisibility,
} from "@tissuumaps/core";

import { AnnotationsWidget } from "@/components/widgets/AnnotationsWidget";
import { useColorGroupValues } from "@/components/widgets/AnnotationsWidget/useColorGroupValues";
import { useGroupColumn } from "@/components/widgets/AnnotationsWidget/useGroupColumn";
import { useGroupTable } from "@/components/widgets/AnnotationsWidget/useGroupTable";
import { useOpacityGroupValues } from "@/components/widgets/AnnotationsWidget/useOpacityGroupValues";
import { useVisibilityGroupValues } from "@/components/widgets/AnnotationsWidget/useVisibilityGroupValues";

import { ShapesSettingsCategory } from "./category";

export type ShapesAnnotationsWidgetProps = {
  shapes: Shapes;
  data: ItemsData;
  activeSettingsCategory: ShapesSettingsCategory | null;
  className?: string;
};

export function ShapesAnnotationsWidget({
  shapes,
  data,
  activeSettingsCategory,
  className,
}: ShapesAnnotationsWidgetProps) {
  const tableId = shapes.dataSource.table ?? null;
  const table = useGroupTable(
    tableId,
    [
      {
        category: ShapesSettingsCategory.shapeFillColor,
        config: shapes.shapeFillColor,
      },
      {
        category: ShapesSettingsCategory.shapeFillVisibility,
        config: shapes.shapeFillVisibility,
      },
      {
        category: ShapesSettingsCategory.shapeFillOpacity,
        config: shapes.shapeFillOpacity,
      },
      {
        category: ShapesSettingsCategory.shapeStrokeColor,
        config: shapes.shapeStrokeColor,
      },
      {
        category: ShapesSettingsCategory.shapeStrokeVisibility,
        config: shapes.shapeStrokeVisibility,
      },
      {
        category: ShapesSettingsCategory.shapeStrokeOpacity,
        config: shapes.shapeStrokeOpacity,
      },
    ],
    activeSettingsCategory,
  );

  const colorValues = useColorGroupValues();
  const visibilityValues = useVisibilityGroupValues();
  const opacityValues = useOpacityGroupValues();

  const fillColorColumn = useGroupColumn(table, {
    name: "fill color",
    default: defaultShapeFillColor,
    config: shapes.shapeFillColor,
    values: colorValues,
  });
  const fillVisibilityColumn = useGroupColumn(table, {
    name: "fill visibility",
    default: defaultShapeFillVisibility,
    config: shapes.shapeFillVisibility,
    values: visibilityValues,
  });
  const fillOpacityColumn = useGroupColumn(table, {
    name: "fill opacity",
    default: defaultShapeFillOpacity,
    config: shapes.shapeFillOpacity,
    values: opacityValues,
  });
  const strokeColorColumn = useGroupColumn(table, {
    name: "outline color",
    default: defaultShapeStrokeColor,
    config: shapes.shapeStrokeColor,
    values: colorValues,
  });
  const strokeVisibilityColumn = useGroupColumn(table, {
    name: "outline visibility",
    default: defaultShapeStrokeVisibility,
    config: shapes.shapeStrokeVisibility,
    values: visibilityValues,
  });
  const strokeOpacityColumn = useGroupColumn(table, {
    name: "outline opacity",
    default: defaultShapeStrokeOpacity,
    config: shapes.shapeStrokeOpacity,
    values: opacityValues,
  });

  const groupColumnDefs = useMemo(
    () =>
      [
        fillColorColumn,
        fillVisibilityColumn,
        fillOpacityColumn,
        strokeColorColumn,
        strokeVisibilityColumn,
        strokeOpacityColumn,
      ].filter((columnDef) => columnDef !== undefined),
    [
      fillColorColumn,
      fillVisibilityColumn,
      fillOpacityColumn,
      strokeColorColumn,
      strokeVisibilityColumn,
      strokeOpacityColumn,
    ],
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

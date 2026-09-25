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
import {
  type GroupProperty,
  useAnnotationsWidget,
} from "@/components/widgets/AnnotationsWidget/useAnnotationsWidget";

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
  const groupProperties = useMemo<GroupProperty[]>(
    () => [
      {
        kind: "color",
        category: ShapesSettingsCategory.shapeFillColor,
        name: "fill color",
        default: defaultShapeFillColor,
        config: shapes.shapeFillColor,
      },
      {
        kind: "visibility",
        category: ShapesSettingsCategory.shapeFillVisibility,
        name: "fill visibility",
        default: defaultShapeFillVisibility,
        config: shapes.shapeFillVisibility,
      },
      {
        kind: "opacity",
        category: ShapesSettingsCategory.shapeFillOpacity,
        name: "fill opacity",
        default: defaultShapeFillOpacity,
        config: shapes.shapeFillOpacity,
      },
      {
        kind: "color",
        category: ShapesSettingsCategory.shapeStrokeColor,
        name: "outline color",
        default: defaultShapeStrokeColor,
        config: shapes.shapeStrokeColor,
      },
      {
        kind: "visibility",
        category: ShapesSettingsCategory.shapeStrokeVisibility,
        name: "outline visibility",
        default: defaultShapeStrokeVisibility,
        config: shapes.shapeStrokeVisibility,
      },
      {
        kind: "opacity",
        category: ShapesSettingsCategory.shapeStrokeOpacity,
        name: "outline opacity",
        default: defaultShapeStrokeOpacity,
        config: shapes.shapeStrokeOpacity,
      },
    ],
    [shapes],
  );

  const {
    selectedGroupByColumn,
    setSelectedGroupByColumn,
    extraGroupColumnDefs,
  } = useAnnotationsWidget(
    shapes.dataSource.table ?? null,
    groupProperties,
    activeSettingsCategory,
  );

  return (
    <AnnotationsWidget
      data={data}
      tableHeight={200}
      table={shapes.dataSource.table ?? null}
      selectedGroupByColumn={selectedGroupByColumn}
      onSelectedGroupByColumnChange={setSelectedGroupByColumn}
      extraGroupColumnDefs={extraGroupColumnDefs}
      className={className}
    />
  );
}

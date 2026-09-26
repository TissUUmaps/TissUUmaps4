import { useMemo } from "react";

import {
  type Labels,
  defaultLabelColor,
  defaultLabelOpacity,
  defaultLabelVisibility,
} from "@tissuumaps/core";

import { AnnotationsWidget } from "@/components/widgets/AnnotationsWidget";
import { useColorGroupValues } from "@/components/widgets/AnnotationsWidget/useColorGroupValues";
import { useGroupColumn } from "@/components/widgets/AnnotationsWidget/useGroupColumn";
import { useGroupTable } from "@/components/widgets/AnnotationsWidget/useGroupTable";
import { useOpacityGroupValues } from "@/components/widgets/AnnotationsWidget/useOpacityGroupValues";
import { useVisibilityGroupValues } from "@/components/widgets/AnnotationsWidget/useVisibilityGroupValues";

import { LabelsSettingsCategory } from "./category";

export type LabelsAnnotationsWidgetProps = {
  labels: Labels;
  activeSettingsCategory: LabelsSettingsCategory | null;
  className?: string;
};

export function LabelsAnnotationsWidget({
  labels,
  activeSettingsCategory,
  className,
}: LabelsAnnotationsWidgetProps) {
  const tableId = labels.dataSource.table ?? null;
  const table = useGroupTable(
    tableId,
    [
      {
        category: LabelsSettingsCategory.labelColor,
        config: labels.labelColor,
      },
      {
        category: LabelsSettingsCategory.labelVisibility,
        config: labels.labelVisibility,
      },
      {
        category: LabelsSettingsCategory.labelOpacity,
        config: labels.labelOpacity,
      },
    ],
    activeSettingsCategory,
  );

  const colorValues = useColorGroupValues();
  const visibilityValues = useVisibilityGroupValues();
  const opacityValues = useOpacityGroupValues();

  const colorColumn = useGroupColumn(table, {
    name: "color",
    default: defaultLabelColor,
    config: labels.labelColor,
    values: colorValues,
  });
  const visibilityColumn = useGroupColumn(table, {
    name: "visibility",
    default: defaultLabelVisibility,
    config: labels.labelVisibility,
    values: visibilityValues,
  });
  const opacityColumn = useGroupColumn(table, {
    name: "opacity",
    default: defaultLabelOpacity,
    config: labels.labelOpacity,
    values: opacityValues,
  });

  const groupColumnDefs = useMemo(
    () =>
      [colorColumn, visibilityColumn, opacityColumn].filter(
        (columnDef) => columnDef !== undefined,
      ),
    [colorColumn, visibilityColumn, opacityColumn],
  );

  return (
    <AnnotationsWidget
      tableHeight={200}
      table={tableId}
      selectedGroupByColumn={table.column}
      onSelectedGroupByColumnChange={table.setColumn}
      extraGroupColumnDefs={groupColumnDefs}
      className={className}
    />
  );
}

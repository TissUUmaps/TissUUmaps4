import { useMemo } from "react";

import {
  type Labels,
  defaultLabelColor,
  defaultLabelOpacity,
  defaultLabelVisibility,
} from "@tissuumaps/core";

import { AnnotationsWidget } from "@/components/widgets/AnnotationsWidget";
import {
  type GroupProperty,
  useAnnotationsWidget,
} from "@/components/widgets/AnnotationsWidget/useAnnotationsWidget";

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
  const groupProperties = useMemo<GroupProperty[]>(
    () => [
      {
        kind: "color",
        category: LabelsSettingsCategory.labelColor,
        name: "color",
        default: defaultLabelColor,
        config: labels.labelColor,
      },
      {
        kind: "visibility",
        category: LabelsSettingsCategory.labelVisibility,
        name: "visibility",
        default: defaultLabelVisibility,
        config: labels.labelVisibility,
      },
      {
        kind: "opacity",
        category: LabelsSettingsCategory.labelOpacity,
        name: "opacity",
        default: defaultLabelOpacity,
        config: labels.labelOpacity,
      },
    ],
    [labels],
  );

  const {
    selectedGroupByColumn,
    setSelectedGroupByColumn,
    extraGroupColumnDefs,
  } = useAnnotationsWidget(
    labels.dataSource.table ?? null,
    groupProperties,
    activeSettingsCategory,
  );

  return (
    <AnnotationsWidget
      tableHeight={200}
      table={labels.dataSource.table ?? null}
      selectedGroupByColumn={selectedGroupByColumn}
      onSelectedGroupByColumnChange={setSelectedGroupByColumn}
      extraGroupColumnDefs={extraGroupColumnDefs}
      className={className}
    />
  );
}

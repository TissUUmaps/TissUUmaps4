import { DicesIcon, SquareIcon } from "lucide-react";

import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
  isRandomConfig,
} from "@tissuumaps/core";

import { formatTableColumnQuery } from "@/components/widgets/TableColumnInput/columnQuery";
import { useProjectStore } from "@/stores/project";

import type { ColorConfigWidgetAdapter } from "./adapter";

export type ActiveColorConfigValueProps = {
  adapter: ColorConfigWidgetAdapter;
  className?: string;
};

export function ActiveColorConfigValue({
  adapter,
  className,
}: ActiveColorConfigValueProps) {
  const { activeSource, colorConfig, defaultColor, tableId } = adapter;

  const tables = useProjectStore((state) => state.tables);

  if (activeSource === "constant" && isConstantConfig(colorConfig)) {
    const { r, g, b } = colorConfig.constant.value;
    return (
      <div className={className}>
        <SquareIcon className="size-4" fill={`rgb(${r}, ${g}, ${b})`} />
      </div>
    );
  }

  if (
    activeSource === "from" &&
    isFromConfig(colorConfig) &&
    tableId !== null
  ) {
    return (
      <div className={className}>
        {formatTableColumnQuery(colorConfig.from, tables)}
      </div>
    );
  }

  if (
    activeSource === "groupBy" &&
    isGroupByConfig(colorConfig) &&
    tableId !== null
  ) {
    return (
      <div className={className}>
        {formatTableColumnQuery(colorConfig.groupBy, tables)}
      </div>
    );
  }

  if (activeSource === "random" && isRandomConfig(colorConfig)) {
    return (
      <div className={className}>
        <DicesIcon className="size-4" />
      </div>
    );
  }

  const { r, g, b } = defaultColor;
  return (
    <div className={className}>
      <SquareIcon className="size-4" fill={`rgb(${r}, ${g}, ${b})`} />
    </div>
  );
}

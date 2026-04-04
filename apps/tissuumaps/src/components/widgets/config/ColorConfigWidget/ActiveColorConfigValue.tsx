import { DicesIcon, SquareIcon } from "lucide-react";

import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
  isRandomConfig,
} from "@tissuumaps/core";

import { useTissUUmaps } from "@/store";

import { type ColorConfigWidgetAdapter } from "./adapter";

export type ActiveColorConfigValueProps = {
  adapter: ColorConfigWidgetAdapter;
  className?: string;
};

export function ActiveColorConfigValue({
  adapter,
  className,
}: ActiveColorConfigValueProps) {
  const { activeSource, colorConfig, defaultColor } = adapter;

  const tables = useTissUUmaps((state) => state.tables);

  if (activeSource === "constant" && isConstantConfig(colorConfig)) {
    const { r, g, b } = colorConfig.constant.value;
    return (
      <div className={className}>
        <SquareIcon className="size-4" fill={`rgb(${r}, ${g}, ${b})`} />
      </div>
    );
  }

  if (activeSource === "from" && isFromConfig(colorConfig)) {
    const tableName =
      tables.find((table) => table.id === colorConfig.from.table)?.name ??
      colorConfig.from.table;
    return (
      <div className={className}>
        {tableName} ({colorConfig.from.column})
      </div>
    );
  }

  if (activeSource === "groupBy" && isGroupByConfig(colorConfig)) {
    const tableName =
      tables.find((table) => table.id === colorConfig.groupBy.table)?.name ??
      colorConfig.groupBy.table;
    return (
      <div className={className}>
        {tableName} ({colorConfig.groupBy.column})
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

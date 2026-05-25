import { DicesIcon, SquareIcon } from "lucide-react";

import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
  isRandomConfig,
} from "@tissuumaps/core";

import { type ColorConfigWidgetAdapter } from "./adapter";

export type ActiveColorConfigValueProps = {
  adapter: ColorConfigWidgetAdapter;
  className?: string;
};

export function ActiveColorConfigValue({
  adapter,
  className,
}: ActiveColorConfigValueProps) {
  const { activeSource, colorConfig, defaultColor, tableId } = adapter;

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
    return <div className={className}>{colorConfig.from.column}</div>;
  }

  if (
    activeSource === "groupBy" &&
    isGroupByConfig(colorConfig) &&
    tableId !== null
  ) {
    return <div className={className}>{colorConfig.groupBy.column}</div>;
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

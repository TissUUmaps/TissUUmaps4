import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import type { SizeConfigWidgetAdapter } from "./adapter";

export type ActiveSizeConfigValueProps = {
  adapter: SizeConfigWidgetAdapter;
  className?: string;
};

export function ActiveSizeConfigValue({
  adapter,
  className,
}: ActiveSizeConfigValueProps) {
  const { activeSource, sizeConfig, defaultSize, tableId } = adapter;

  if (activeSource === "constant" && isConstantConfig(sizeConfig)) {
    return <div className={className}>{sizeConfig.constant.value}</div>;
  }

  if (activeSource === "from" && isFromConfig(sizeConfig) && tableId !== null) {
    return <div className={className}>{sizeConfig.from.column}</div>;
  }

  if (
    activeSource === "groupBy" &&
    isGroupByConfig(sizeConfig) &&
    tableId !== null
  ) {
    return <div className={className}>{sizeConfig.groupBy.column}</div>;
  }

  return <div className={className}>{defaultSize}</div>;
}

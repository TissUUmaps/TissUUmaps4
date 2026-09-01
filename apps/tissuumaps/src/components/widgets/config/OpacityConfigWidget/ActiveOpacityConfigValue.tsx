import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import type { OpacityConfigWidgetAdapter } from "./adapter";

export type ActiveOpacityConfigValueProps = {
  adapter: OpacityConfigWidgetAdapter;
  className?: string;
};

export function ActiveOpacityConfigValue({
  adapter,
  className,
}: ActiveOpacityConfigValueProps) {
  const { activeSource, opacityConfig, defaultOpacity, tableId } = adapter;

  if (activeSource === "constant" && isConstantConfig(opacityConfig)) {
    return (
      <div className={className}>{opacityConfig.constant.value.toFixed(2)}</div>
    );
  }

  if (
    activeSource === "from" &&
    isFromConfig(opacityConfig) &&
    tableId !== null
  ) {
    return <div className={className}>{opacityConfig.from.column}</div>;
  }

  if (
    activeSource === "groupBy" &&
    isGroupByConfig(opacityConfig) &&
    tableId !== null
  ) {
    return <div className={className}>{opacityConfig.groupBy.column}</div>;
  }

  return <div className={className}>{defaultOpacity.toFixed(2)}</div>;
}

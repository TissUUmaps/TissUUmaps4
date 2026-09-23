import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { formatTableColumnQuery } from "@/components/widgets/TableColumnInput/columnQuery";
import { useProjectStore } from "@/stores/project";

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

  const tables = useProjectStore((state) => state.tables);

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
    return (
      <div className={className}>
        {formatTableColumnQuery(opacityConfig.from, tables)}
      </div>
    );
  }

  if (
    activeSource === "groupBy" &&
    isGroupByConfig(opacityConfig) &&
    tableId !== null
  ) {
    return (
      <div className={className}>
        {formatTableColumnQuery(opacityConfig.groupBy, tables)}
      </div>
    );
  }

  return <div className={className}>{defaultOpacity.toFixed(2)}</div>;
}

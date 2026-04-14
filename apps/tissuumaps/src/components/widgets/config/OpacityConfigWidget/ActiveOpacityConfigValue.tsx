import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { useTissUUmaps } from "@/store";

import { type OpacityConfigWidgetAdapter } from "./adapter";

export type ActiveOpacityConfigValueProps = {
  adapter: OpacityConfigWidgetAdapter;
  className?: string;
};

export function ActiveOpacityConfigValue({
  adapter,
  className,
}: ActiveOpacityConfigValueProps) {
  const { activeSource, opacityConfig, defaultOpacity } = adapter;

  const tables = useTissUUmaps((state) => state.tables);

  if (activeSource === "constant" && isConstantConfig(opacityConfig)) {
    return (
      <div className={className}>{opacityConfig.constant.value.toFixed(2)}</div>
    );
  }

  if (activeSource === "from" && isFromConfig(opacityConfig)) {
    const table = tables.find((t) => t.id === opacityConfig.from.table);
    const tableName =
      table !== undefined ? table.name : opacityConfig.from.table;
    return (
      <div className={className}>
        {tableName} ({opacityConfig.from.column})
      </div>
    );
  }

  if (activeSource === "groupBy" && isGroupByConfig(opacityConfig)) {
    const table = tables.find((t) => t.id === opacityConfig.groupBy.table);
    const tableName =
      table !== undefined ? table.name : opacityConfig.groupBy.table;
    return (
      <div className={className}>
        {tableName} ({opacityConfig.groupBy.column})
      </div>
    );
  }

  return <div className={className}>{defaultOpacity.toFixed(2)}</div>;
}

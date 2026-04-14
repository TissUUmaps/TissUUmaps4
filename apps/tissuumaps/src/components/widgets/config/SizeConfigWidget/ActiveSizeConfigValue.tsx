import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { useTissUUmaps } from "@/store";

import { type SizeConfigWidgetAdapter } from "./adapter";

export type ActiveSizeConfigValueProps = {
  adapter: SizeConfigWidgetAdapter;
  className?: string;
};

export function ActiveSizeConfigValue({
  adapter,
  className,
}: ActiveSizeConfigValueProps) {
  const { activeSource, sizeConfig, defaultSize } = adapter;

  const tables = useTissUUmaps((state) => state.tables);

  if (activeSource === "constant" && isConstantConfig(sizeConfig)) {
    return <div className={className}>{sizeConfig.constant.value}</div>;
  }

  if (activeSource === "from" && isFromConfig(sizeConfig)) {
    const table = tables.find((t) => t.id === sizeConfig.from.table);
    const tableName = table !== undefined ? table.name : sizeConfig.from.table;
    return (
      <div className={className}>
        {tableName} ({sizeConfig.from.column})
      </div>
    );
  }

  if (activeSource === "groupBy" && isGroupByConfig(sizeConfig)) {
    const table = tables.find((t) => t.id === sizeConfig.groupBy.table);
    const tableName =
      table !== undefined ? table.name : sizeConfig.groupBy.table;
    return (
      <div className={className}>
        {tableName} ({sizeConfig.groupBy.column})
      </div>
    );
  }

  return <div className={className}>{defaultSize}</div>;
}

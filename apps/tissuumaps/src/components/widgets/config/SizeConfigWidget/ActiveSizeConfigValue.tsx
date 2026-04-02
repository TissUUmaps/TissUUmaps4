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
  const tables = useTissUUmaps((state) => state.tables);

  const { activeSource, sizeConfig, defaultSize } = adapter;

  if (activeSource === "constant" && isConstantConfig(sizeConfig)) {
    return <div className={className}>{sizeConfig.constant.value}</div>;
  }

  if (activeSource === "from" && isFromConfig(sizeConfig)) {
    const tableName =
      tables.find((table) => table.id === sizeConfig.from.table)?.name ??
      sizeConfig.from.table;
    return (
      <div className={className}>
        {tableName} ({sizeConfig.from.column})
      </div>
    );
  }

  if (activeSource === "groupBy" && isGroupByConfig(sizeConfig)) {
    const tableName =
      tables.find((table) => table.id === sizeConfig.groupBy.table)?.name ??
      sizeConfig.groupBy.table;
    return (
      <div className={className}>
        {tableName} ({sizeConfig.groupBy.column})
      </div>
    );
  }

  return <div className={className}>{defaultSize}</div>;
}

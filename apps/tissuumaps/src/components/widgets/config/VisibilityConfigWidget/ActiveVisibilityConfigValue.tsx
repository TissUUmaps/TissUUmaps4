import { EyeIcon, EyeOffIcon } from "lucide-react";

import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { useTissUUmaps } from "@/store";

import { type VisibilityConfigWidgetAdapter } from "./adapter";

export type ActiveVisibilityConfigValueProps = {
  adapter: VisibilityConfigWidgetAdapter;
  className?: string;
};

export function ActiveVisibilityConfigValue({
  adapter,
  className,
}: ActiveVisibilityConfigValueProps) {
  const tables = useTissUUmaps((state) => state.tables);

  const { activeSource, visibilityConfig, defaultVisibility } = adapter;

  if (activeSource === "constant" && isConstantConfig(visibilityConfig)) {
    return (
      <div className={className}>
        {visibilityConfig.constant.value ? (
          <EyeIcon className="size-4" />
        ) : (
          <EyeOffIcon className="size-4" />
        )}
      </div>
    );
  }

  if (activeSource === "from" && isFromConfig(visibilityConfig)) {
    const tableName =
      tables.find((table) => table.id === visibilityConfig.from.table)?.name ??
      visibilityConfig.from.table;
    return (
      <div className={className}>
        {tableName} ({visibilityConfig.from.column})
      </div>
    );
  }

  if (activeSource === "groupBy" && isGroupByConfig(visibilityConfig)) {
    const tableName =
      tables.find((table) => table.id === visibilityConfig.groupBy.table)
        ?.name ?? visibilityConfig.groupBy.table;
    return (
      <div className={className}>
        {tableName} ({visibilityConfig.groupBy.column})
      </div>
    );
  }

  return (
    <div className={className}>
      {defaultVisibility ? (
        <EyeIcon className="size-4" />
      ) : (
        <EyeOffIcon className="size-4" />
      )}
    </div>
  );
}

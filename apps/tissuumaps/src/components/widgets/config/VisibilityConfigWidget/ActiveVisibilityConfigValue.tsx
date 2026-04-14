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
  const { activeSource, visibilityConfig, defaultVisibility } = adapter;

  const tables = useTissUUmaps((state) => state.tables);

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
    const table = tables.find((t) => t.id === visibilityConfig.from.table);
    const tableName =
      table !== undefined ? table.name : visibilityConfig.from.table;
    return (
      <div className={className}>
        {tableName} ({visibilityConfig.from.column})
      </div>
    );
  }

  if (activeSource === "groupBy" && isGroupByConfig(visibilityConfig)) {
    const table = tables.find((t) => t.id === visibilityConfig.groupBy.table);
    const tableName =
      table !== undefined ? table.name : visibilityConfig.groupBy.table;
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

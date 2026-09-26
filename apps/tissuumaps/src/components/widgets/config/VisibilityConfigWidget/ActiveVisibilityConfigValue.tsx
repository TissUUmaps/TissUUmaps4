import { EyeIcon, EyeOffIcon } from "lucide-react";

import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { formatTableColumnQuery } from "@/components/widgets/TableColumnInput/columnQuery";
import { useProjectStore } from "@/stores/project";

import type { VisibilityConfigWidgetAdapter } from "./adapter";

export type ActiveVisibilityConfigValueProps = {
  adapter: VisibilityConfigWidgetAdapter;
  className?: string;
};

export function ActiveVisibilityConfigValue({
  adapter,
  className,
}: ActiveVisibilityConfigValueProps) {
  const { activeSource, visibilityConfig, defaultVisibility, tableId } =
    adapter;

  const tables = useProjectStore((state) => state.tables);

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

  if (
    activeSource === "from" &&
    isFromConfig(visibilityConfig) &&
    tableId !== null
  ) {
    return (
      <div className={className}>
        {formatTableColumnQuery(visibilityConfig.from, tables)}
      </div>
    );
  }

  if (
    activeSource === "groupBy" &&
    isGroupByConfig(visibilityConfig) &&
    tableId !== null
  ) {
    return (
      <div className={className}>
        {formatTableColumnQuery(visibilityConfig.groupBy, tables)}
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

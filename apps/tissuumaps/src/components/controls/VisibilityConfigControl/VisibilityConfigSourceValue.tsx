import { EyeIcon, EyeOffIcon } from "lucide-react";
import { type HTMLProps } from "react";

import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { useVisibilityConfigContext } from "./context";

export type VisibilityConfigSourceValueProps = HTMLProps<HTMLDivElement>;

export function VisibilityConfigSourceValue(
  props: VisibilityConfigSourceValueProps,
) {
  const tables = useTissUUmaps((state) => state.tables);

  const { activeSource, visibilityConfig, defaultVisibility } =
    useVisibilityConfigContext();

  if (activeSource === "constant" && isConstantConfig(visibilityConfig)) {
    return (
      <div {...props}>
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
      <div {...props}>
        {tableName} ({visibilityConfig.from.column})
      </div>
    );
  }

  if (activeSource === "groupBy" && isGroupByConfig(visibilityConfig)) {
    const tableName =
      tables.find((table) => table.id === visibilityConfig.groupBy.table)
        ?.name ?? visibilityConfig.groupBy.table;
    return (
      <div {...props}>
        {tableName} ({visibilityConfig.groupBy.column})
      </div>
    );
  }

  return (
    <div {...props}>
      {defaultVisibility ? (
        <EyeIcon className="size-4" />
      ) : (
        <EyeOffIcon className="size-4" />
      )}
    </div>
  );
}

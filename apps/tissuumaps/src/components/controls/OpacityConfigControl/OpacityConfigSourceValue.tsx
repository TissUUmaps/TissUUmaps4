import { type HTMLProps } from "react";

import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { useOpacityConfigContext } from "./context";

export type OpacityConfigSourceValueProps = HTMLProps<HTMLDivElement>;

export function OpacityConfigSourceValue(props: OpacityConfigSourceValueProps) {
  const tables = useTissUUmaps((state) => state.tables);

  const { activeSource, opacityConfig, defaultOpacity } =
    useOpacityConfigContext();

  if (activeSource === "constant" && isConstantConfig(opacityConfig)) {
    return <div {...props}>{opacityConfig.constant.value.toFixed(2)}</div>;
  }

  if (activeSource === "from" && isFromConfig(opacityConfig)) {
    const tableName =
      tables.find((table) => table.id === opacityConfig.from.table)?.name ??
      opacityConfig.from.table;
    return (
      <div {...props}>
        {tableName} ({opacityConfig.from.column})
      </div>
    );
  }

  if (activeSource === "groupBy" && isGroupByConfig(opacityConfig)) {
    const tableName =
      tables.find((table) => table.id === opacityConfig.groupBy.table)?.name ??
      opacityConfig.groupBy.table;
    return (
      <div {...props}>
        {tableName} ({opacityConfig.groupBy.column})
      </div>
    );
  }

  return <div {...props}>{defaultOpacity.toFixed(2)}</div>;
}

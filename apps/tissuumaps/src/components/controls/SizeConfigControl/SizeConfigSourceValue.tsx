import { type HTMLProps } from "react";

import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { useSizeConfigContext } from "./context";

export type SizeConfigSourceValueProps = HTMLProps<HTMLDivElement>;

export function SizeConfigSourceValue(props: SizeConfigSourceValueProps) {
  const tables = useTissUUmaps((state) => state.tables);

  const { activeSource, sizeConfig, defaultSize } = useSizeConfigContext();

  if (activeSource === "constant" && isConstantConfig(sizeConfig)) {
    return <div {...props}>{sizeConfig.constant.value}</div>;
  }

  if (activeSource === "from" && isFromConfig(sizeConfig)) {
    const tableName =
      tables.find((table) => table.id === sizeConfig.from.table)?.name ??
      sizeConfig.from.table;
    return (
      <div {...props}>
        {tableName} ({sizeConfig.from.column})
      </div>
    );
  }

  if (activeSource === "groupBy" && isGroupByConfig(sizeConfig)) {
    const tableName =
      tables.find((table) => table.id === sizeConfig.groupBy.table)?.name ??
      sizeConfig.groupBy.table;
    return (
      <div {...props}>
        {tableName} ({sizeConfig.groupBy.column})
      </div>
    );
  }

  return <div {...props}>{defaultSize}</div>;
}

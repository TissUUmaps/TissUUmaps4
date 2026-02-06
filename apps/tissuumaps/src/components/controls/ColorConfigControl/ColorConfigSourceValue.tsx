import { DicesIcon, SquareIcon } from "lucide-react";
import { type HTMLProps } from "react";

import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
  isRandomConfig,
} from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { useColorConfigContext } from "./context";

export type ColorConfigSourceValueProps = HTMLProps<HTMLDivElement>;

export function ColorConfigSourceValue(props: ColorConfigSourceValueProps) {
  const tables = useTissUUmaps((state) => state.tables);

  const { activeSource, colorConfig, defaultColor } = useColorConfigContext();

  if (activeSource === "constant" && isConstantConfig(colorConfig)) {
    const { r, g, b } = colorConfig.constant.value;
    return (
      <div {...props}>
        <SquareIcon className="size-4" fill={`rgb(${r}, ${g}, ${b})`} />
      </div>
    );
  }

  if (activeSource === "from" && isFromConfig(colorConfig)) {
    const tableName =
      tables.find((table) => table.id === colorConfig.from.table)?.name ??
      colorConfig.from.table;
    return (
      <div {...props}>
        {tableName} ({colorConfig.from.column})
      </div>
    );
  }

  if (activeSource === "groupBy" && isGroupByConfig(colorConfig)) {
    const tableName =
      tables.find((table) => table.id === colorConfig.groupBy.table)?.name ??
      colorConfig.groupBy.table;
    return (
      <div {...props}>
        {tableName} ({colorConfig.groupBy.column})
      </div>
    );
  }

  if (activeSource === "random" && isRandomConfig(colorConfig)) {
    return (
      <div {...props}>
        <DicesIcon className="size-4" />
      </div>
    );
  }

  const { r, g, b } = defaultColor;
  return (
    <div {...props}>
      <SquareIcon className="size-4" fill={`rgb(${r}, ${g}, ${b})`} />
    </div>
  );
}

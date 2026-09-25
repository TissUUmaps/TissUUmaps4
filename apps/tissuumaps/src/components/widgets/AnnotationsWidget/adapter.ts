import type { ReactNode } from "react";

import type { Config, GroupByConfig, GroupValueMap } from "@tissuumaps/core";

/** Width of a column of markers, colors or eye buttons, in pixels */
export const groupColumnSize = 60;

/** Width of a column of number inputs, in pixels */
export const numericGroupColumnSize = 90;

/** How the group table shows, edits and sorts the values of one type */
export type GroupCell<TValue> = {
  /** Width of the column, in pixels */
  size: number;

  /** The value that the rows sort by; the column is not sortable without */
  getSortValue?: (value: TValue) => number | string;

  render: (value: TValue, onValueChange: (value: TValue) => void) => ReactNode;
};

/**
 * What the group table needs to know about one type of group value
 *
 * Each value type has its own hook that returns its adapter (e.g.
 * `useColorGroupValues`), so that the shared group table hooks never name the
 * value types.
 */
export type GroupValuesAdapter<TValue, TConfig extends Config<string>> = {
  /** The project's maps of this value type */
  maps: GroupValueMap<TValue>[];

  addMap: (map: GroupValueMap<TValue>) => void;

  updateMap: (
    mapId: string,
    updates: Partial<Omit<GroupValueMap<TValue>, "id">>,
  ) => void;

  cell: GroupCell<TValue>;

  /** Returns the values that a configuration without a map picks from */
  getPalette?: (
    config: Extract<TConfig, GroupByConfig<false>>,
  ) => readonly TValue[] | undefined;
};

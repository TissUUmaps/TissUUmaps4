import { type FromConfig, type GroupByConfig } from "../../model/configs";
import { type TableData } from "../../storage/table";
import { type TypedArray } from "../../types";

export class DataUtilsBase {
  /**
   * Fills `data` by loading values from the configured table column
   *
   * For each ID in `ids`, the corresponding row is looked up in the loaded table by ID.
   * The raw cell value is parsed by `parseTableValue`; if parsing fails, `defaultValue` is used instead.
   *
   * @param data - Output typed array to fill
   * @param ids - Ordered list of item IDs
   * @param config - A `FromConfig` specifying the source table and column
   * @param defaultValue - Value used when the ID is missing or parsing fails
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param parseTableValue - Converts a raw cell value to `TValue`, or `undefined` on failure
   * @param encodeValue - Converts `TValue` to the numeric representation stored in `data`
   * @param options - Optional abort signal
   */
  protected static async fillFromConfigData<TValue>(
    data: TypedArray,
    ids: number[],
    config: FromConfig,
    defaultValue: TValue,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    parseTableValue: (
      value: unknown,
      valueRange: [number, number] | undefined,
    ) => TValue | undefined,
    encodeValue: (value: TValue) => number,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const tableData = await loadTable(config.from.table, { signal });
    signal?.throwIfAborted();
    const tableValues = await tableData.loadValues(config.from.column, {
      signal,
    });
    signal?.throwIfAborted();
    const tableValueRange = await tableData.loadValueRange(config.from.column, {
      signal,
    });
    signal?.throwIfAborted();
    const tableValuesById = new Map<number, unknown>();
    tableData.getIds().forEach((id, i) => {
      tableValuesById.set(id, tableValues[i]);
    });
    ids.forEach((id, i) => {
      if (tableValuesById.has(id)) {
        const tableValue = tableValuesById.get(id);
        const value = parseTableValue(tableValue, tableValueRange);
        data[i] = encodeValue(value ?? defaultValue);
      } else {
        console.warn(`ID ${id} missing in table ${config.from.table}`);
        data[i] = encodeValue(defaultValue);
      }
    });
  }

  /**
   * Fills `data` by loading group keys from the configured table column and mapping them to values.
   *
   * For each ID in `ids`, the corresponding row is looked up in the loaded table by ID.
   * The raw cell value is JSON-stringified to produce a group key, which is then mapped to a value using `mapGroupToValue`.
   * If the mapping fails, `defaultValue` is used instead.
   *
   * @param data - Output typed array to fill
   * @param ids - Ordered list of item IDs
   * @param config - A `GroupByConfig` specifying the source table and column
   * @param defaultValue - Value used when the ID is missing or the group is unmapped
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param mapGroupToValue - Maps a JSON-stringified group key to `TValue`, or `undefined`
   * @param encodeValue - Converts `TValue` to the numeric representation stored in `data`
   * @param options - Optional abort signal
   */
  protected static async fillGroupByConfigData<
    TValue,
    TMapRequired extends boolean,
  >(
    data: TypedArray,
    ids: number[],
    config: GroupByConfig<TMapRequired>,
    defaultValue: TValue,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    mapGroupToValue: (group: string) => TValue | undefined,
    encodeValue: (value: TValue) => number,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const tableData = await loadTable(config.groupBy.table, { signal });
    signal?.throwIfAborted();
    const tableGroups = await tableData.loadValues(config.groupBy.column, {
      signal,
    });
    signal?.throwIfAborted();
    const tableGroupsById = new Map<number, unknown>();
    tableData.getIds().forEach((id, i) => {
      tableGroupsById.set(id, tableGroups[i]);
    });
    ids.forEach((id, i) => {
      if (tableGroupsById.has(id)) {
        const tableGroup = tableGroupsById.get(id);
        const group = JSON.stringify(tableGroup);
        const value = mapGroupToValue(group);
        data[i] = encodeValue(value ?? defaultValue);
      } else {
        console.warn(`ID ${id} missing in table ${config.groupBy.table}`);
        data[i] = encodeValue(defaultValue);
      }
    });
  }
}

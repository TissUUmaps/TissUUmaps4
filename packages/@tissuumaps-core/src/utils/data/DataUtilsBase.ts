import type { TableData } from "../../storage/table";
import type { TypedArray } from "../../types";
import { AsyncUtils } from "../AsyncUtils";

export class DataUtilsBase {
  /**
   * Fills `data` by loading values from the configured table column
   *
   * For each ID in `ids`, the corresponding row is looked up in the loaded table by ID.
   * The raw cell value is parsed by `parseTableValue`; if parsing fails, `defaultValue` is used instead.
   *
   * @param data - Output typed array to fill
   * @param ids - Ordered list of item IDs
   * @param column - Name of the table column to load values from
   * @param defaultValue - Value used when the ID is missing or parsing fails
   * @param loadTable - Async function that loads the {@link TableData}
   * @param parseTableValue - Converts a raw cell value to `TValue`, or `undefined` on failure
   * @param encodeValue - Converts `TValue` to the numeric representation stored in `data`
   * @param options - Optional abort signal
   */
  protected static async fillDataFromTableValues<TValue>(
    data: TypedArray,
    ids: number[],
    column: string,
    defaultValue: TValue,
    loadTable: (options?: { signal?: AbortSignal }) => Promise<TableData>,
    parseTableValue: (
      value: unknown,
      valueRange: [number, number] | undefined,
    ) => TValue | undefined,
    encodeValue: (value: TValue) => number,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const tableData = await loadTable({ signal });
    signal?.throwIfAborted();
    const tableValues = await tableData.loadValues(column, { signal });
    signal?.throwIfAborted();
    const tableValueRange = await tableData.loadValueRange(column, { signal });
    signal?.throwIfAborted();
    const tableValuesById = new Map<number, unknown>();
    await AsyncUtils.forEach(
      tableData.getIds(),
      (id, i) => {
        tableValuesById.set(id, tableValues[i]);
      },
      { signal },
    );
    await AsyncUtils.forEach(
      ids,
      (id, i) => {
        if (tableValuesById.has(id)) {
          const tableValue = tableValuesById.get(id);
          const parsedValue = parseTableValue(tableValue, tableValueRange);
          data[i] = encodeValue(parsedValue ?? defaultValue);
        } else {
          console.warn(
            `ID ${id} is missing from loaded table data (column ${column})`,
          );
          data[i] = encodeValue(defaultValue);
        }
      },
      { signal },
    );
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
   * @param column - Name of the table column to load group keys from
   * @param defaultValue - Value used when the ID is missing or the group is unmapped
   * @param loadTable - Async function that loads the {@link TableData}
   * @param mapGroupToValue - Maps a JSON-stringified group key to `TValue`, or `undefined`
   * @param encodeValue - Converts `TValue` to the numeric representation stored in `data`
   * @param options - Optional abort signal
   */
  protected static async fillDataFromTableGroups<TValue>(
    data: TypedArray,
    ids: number[],
    column: string,
    defaultValue: TValue,
    loadTable: (options?: { signal?: AbortSignal }) => Promise<TableData>,
    mapGroupToValue: (group: string) => TValue | undefined,
    encodeValue: (value: TValue) => number,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const tableData = await loadTable({ signal });
    signal?.throwIfAborted();
    const tableGroups = await tableData.loadValues(column, { signal });
    signal?.throwIfAborted();
    const tableGroupsById = new Map<number, unknown>();
    await AsyncUtils.forEach(
      tableData.getIds(),
      (id, i) => {
        tableGroupsById.set(id, tableGroups[i]);
      },
      { signal },
    );
    const encodedValueByTableGroup = new Map<unknown, number>();
    await AsyncUtils.forEach(
      ids,
      (id, i) => {
        if (tableGroupsById.has(id)) {
          const tableGroup = tableGroupsById.get(id);
          let encodedValue = encodedValueByTableGroup.get(tableGroup);
          if (encodedValue === undefined) {
            const group = JSON.stringify(tableGroup);
            const value = mapGroupToValue(group);
            encodedValue = encodeValue(value ?? defaultValue);
            encodedValueByTableGroup.set(tableGroup, encodedValue);
          }
          data[i] = encodedValue;
        } else {
          console.warn(
            `ID ${id} is missing from loaded table data (column ${column})`,
          );
          data[i] = encodeValue(defaultValue);
        }
      },
      { signal },
    );
  }
}

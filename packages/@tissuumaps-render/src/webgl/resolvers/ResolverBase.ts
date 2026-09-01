import { AsyncUtils, type TableData, type TypedArray } from "@tissuumaps/core";

/**
 * Base class of the resolvers, providing the shared table lookups
 *
 * A resolver turns the configuration of a rendered property — a constant, a
 * table column, a grouping over a table column, or a random assignment — into a
 * typed array holding one encoded value per item, ready to be uploaded to the
 * GPU. Items are addressed by ID, and IDs that the table does not contain fall
 * back to a default value, with a warning.
 */
export abstract class ResolverBase {
  /**
   * Fills `buffer` by loading values from the given table column
   *
   * For each ID in `ids`, the corresponding row is looked up in the table by ID.
   * The raw cell value is parsed by `parseTableValue`; if that fails, or if the
   * table does not contain the ID, `defaultValue` is used instead.
   *
   * @param buffer - Output typed array to fill, in the order of `ids`
   * @param tableData - The table to look up values in
   * @param ids - Ordered list of item IDs
   * @param column - Name of the table column to load values from
   * @param defaultValue - Value used when the ID is missing or parsing fails
   * @param parseTableValue - Converts a raw cell value, plus the value range of
   * the column, to `TValue`, or to `undefined` on failure
   * @param encodeValue - Converts `TValue` to the numeric representation stored
   * in `buffer`
   * @param options - Optional abort signal
   */
  static async fillFromTableValues<TValue>(
    buffer: TypedArray,
    tableData: TableData,
    ids: number[],
    column: string,
    defaultValue: TValue,
    parseTableValue: (
      value: unknown,
      valueRange: [number, number] | undefined,
    ) => TValue | undefined,
    encodeValue: (value: TValue) => number,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const tableValues = await tableData.loadValues(column, { signal });
    const tableValueRange = await tableData.loadValueRange(column, { signal });
    const tableValuesById = new Map<number, unknown>();
    await AsyncUtils.forEach(
      tableData.getIds(),
      (id, i) => {
        tableValuesById.set(id, tableValues[i]);
      },
      { signal },
    );
    let numMissingIds = 0;
    let numUnparsedValues = 0;
    await AsyncUtils.forEach(
      ids,
      (id, i) => {
        if (tableValuesById.has(id)) {
          const tableValue = tableValuesById.get(id);
          const parsedValue = parseTableValue(tableValue, tableValueRange);
          if (parsedValue === undefined) {
            numUnparsedValues++;
          }
          buffer[i] = encodeValue(parsedValue ?? defaultValue);
        } else {
          numMissingIds++;
          buffer[i] = encodeValue(defaultValue);
        }
      },
      { signal },
    );
    if (numMissingIds > 0) {
      console.warn(
        `${numMissingIds} IDs missing in column ${column}, using default value`,
      );
    }
    if (numUnparsedValues > 0) {
      console.warn(
        `Failed to parse ${numUnparsedValues} values from column ${column}, using default value`,
      );
    }
  }

  /**
   * Fills `buffer` by grouping IDs by the given table column and mapping the groups to values
   *
   * For each ID in `ids`, the corresponding row is looked up in the table by ID.
   * The raw cell value is JSON-stringified into a group key, which
   * `mapGroupToValue` maps to a value; if that fails, or if the table does not
   * contain the ID, `defaultValue` is used instead. Groups are resolved once per
   * distinct cell value, i.e. `mapGroupToValue` is not called per item.
   *
   * @param buffer - Output typed array to fill, in the order of `ids`
   * @param tableData - The table to look up group keys in
   * @param ids - Ordered list of item IDs
   * @param column - Name of the table column to load group keys from
   * @param defaultValue - Value used when the ID is missing or the group is unmapped
   * @param mapGroupToValue - Maps a JSON-stringified group key to `TValue`, or to `undefined`
   * @param encodeValue - Converts `TValue` to the numeric representation stored
   * in `buffer`
   * @param options - Optional abort signal
   */
  static async fillFromTableGroups<TValue>(
    buffer: TypedArray,
    tableData: TableData,
    ids: number[],
    column: string,
    defaultValue: TValue,
    mapGroupToValue: (group: string) => TValue | undefined,
    encodeValue: (value: TValue) => number,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const tableGroups = await tableData.loadValues(column, { signal });
    const tableGroupsById = new Map<number, unknown>();
    await AsyncUtils.forEach(
      tableData.getIds(),
      (id, i) => {
        tableGroupsById.set(id, tableGroups[i]);
      },
      { signal },
    );
    let numMissingIds = 0;
    let numUnmappedGroups = 0;
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
            if (value === undefined) {
              numUnmappedGroups++;
            }
            encodedValue = encodeValue(value ?? defaultValue);
            encodedValueByTableGroup.set(tableGroup, encodedValue);
          }
          buffer[i] = encodedValue;
        } else {
          numMissingIds++;
          buffer[i] = encodeValue(defaultValue);
        }
      },
      { signal },
    );
    if (numMissingIds > 0) {
      console.warn(
        `${numMissingIds} IDs missing in column ${column}, using default value`,
      );
    }
    if (numUnmappedGroups > 0) {
      console.warn(
        `Failed to map ${numUnmappedGroups} groups from column ${column}, using default value`,
      );
    }
  }
}

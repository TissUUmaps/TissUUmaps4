import type { FileMetaData } from "hyparquet";

/**
 * The `pandas` metadata of a Parquet file written by pandas
 *
 * `index_columns` lists where the DataFrame index went: an entry is the name
 * of the column it was written as, or a description of a `RangeIndex` that was
 * not written at all. `columns` describes every column, the index ones
 * included, and gives the pandas dtype each was written from.
 */
type PandasMetadata = {
  index_columns?: (string | { kind: string })[];
  columns?: { field_name?: string; pandas_type?: string }[];
};

/** Helpers for the `pandas` metadata of a Parquet file written by pandas */
export class PandasMetadataUtils {
  /** Matches the pandas dtype of a column TissUUmaps can key its rows by */
  private static readonly _integerPandasType = /^u?int(8|16|32|64)?$/i;

  /**
   * Reads the column a pandas DataFrame index was written as
   *
   * Parquet has no index, so pandas either writes the index as an ordinary
   * column, named in the `pandas` metadata, or, for a `RangeIndex`, writes
   * nothing and records the range instead.
   *
   * Only an integer index is returned: item IDs are numbers, so keying rows
   * by a string index would fail the read of a file that is otherwise
   * readable.
   *
   * @param metadata - The file metadata
   * @returns The name of the index column, or `undefined` for files without
   * pandas metadata, for files whose index was not written, and for files
   * whose index is not a single integer level
   */
  static readIndexColumn(metadata: FileMetaData): string | undefined {
    const pandas = metadata.key_value_metadata?.find(
      ({ key }) => key === "pandas",
    );
    if (pandas?.value === undefined) {
      return undefined;
    }
    const { index_columns = [], columns = [] } = JSON.parse(
      pandas.value,
    ) as PandasMetadata;
    // A multi-level index has no single column to key by
    const [indexColumn, ...moreLevels] = index_columns;
    if (typeof indexColumn !== "string" || moreLevels.length > 0) {
      return undefined;
    }
    const { pandas_type } =
      columns.find(({ field_name }) => field_name === indexColumn) ?? {};
    return pandas_type !== undefined &&
      PandasMetadataUtils._integerPandasType.test(pandas_type)
      ? indexColumn
      : undefined;
  }
}

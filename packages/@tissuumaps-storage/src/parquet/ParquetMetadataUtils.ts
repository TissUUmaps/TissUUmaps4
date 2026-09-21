import type { FileMetaData } from "hyparquet";

/**
 * A geometry column of a GeoParquet file
 *
 * Only columns encoded as WKB are described: other encodings are not decoded
 * by the Parquet reader and are read as their raw values.
 */
export type GeoColumn = {
  /** Name of the column */
  name: string;

  /** Whether the column is the file's primary geometry column */
  primary: boolean;

  /** The geometry types in the column, as listed in the `geo` metadata */
  geometryTypes: string[];

  /** The column's `[minX, minY, maxX, maxY]` bounds, if listed */
  bbox: [number, number, number, number] | undefined;
};

/** The `geo` metadata of a GeoParquet file, as written by the GeoParquet spec */
type GeoMetadata = {
  primary_column?: string;
  columns?: {
    [name: string]: {
      encoding?: string;
      geometry_types?: string[];
      bbox?: number[];
    };
  };
};

/**
 * The `pandas` metadata of a Parquet file written by pandas
 *
 * `index_columns` lists where the DataFrame index went: an entry is the name
 * of the column it was written as, or a description of a `RangeIndex` that was
 * not written at all.
 */
type PandasMetadata = {
  index_columns?: (string | { kind: string })[];
};

/**
 * Helpers for the metadata a Parquet file carries in its footer
 *
 * GeoParquet describes its geometry columns in the `geo` metadata, and pandas
 * records its DataFrame index in the `pandas` metadata. Point
 * geometry columns are read as a pair of coordinate columns selected from the
 * geometry column, e.g. `geometry[x]` and `geometry[y]`, so that point
 * geometries can be used wherever a numeric column is expected.
 */
export class ParquetMetadataUtils {
  /** Matches a coordinate column, capturing its geometry column and its axis */
  private static readonly _coordinateColumnPattern = /^(.*)\[([xy])\]$/;

  /** Reads the 2D bounds of a `bbox`, which lists Z bounds too for 3D columns */
  private static _readBBox(
    bbox: number[] | undefined,
  ): [number, number, number, number] | undefined {
    if (bbox?.length === 4) {
      return [bbox[0]!, bbox[1]!, bbox[2]!, bbox[3]!];
    }
    if (bbox?.length === 6) {
      return [bbox[0]!, bbox[1]!, bbox[3]!, bbox[4]!];
    }
    return undefined;
  }

  /**
   * Reads the geometry columns of a file
   *
   * @param metadata - The file metadata
   * @returns The geometry columns, in metadata order, or an empty array for
   * files without GeoParquet metadata
   */
  static readGeoColumns(metadata: FileMetaData): GeoColumn[] {
    const geo = metadata.key_value_metadata?.find(({ key }) => key === "geo");
    if (geo?.value === undefined) {
      return [];
    }
    const { primary_column, columns = {} } = JSON.parse(
      geo.value,
    ) as GeoMetadata;
    return Object.entries(columns)
      .filter(([, column]) => column.encoding === "WKB")
      .map(([name, column]) => ({
        name,
        primary: name === primary_column,
        geometryTypes: column.geometry_types ?? [],
        bbox: ParquetMetadataUtils._readBBox(column.bbox),
      }));
  }

  /**
   * Returns the primary geometry column of a file
   *
   * @param geoColumns - The geometry columns of the file
   * @returns The column marked as primary, the first geometry column of files
   * that do not mark one, or `undefined` for files without geometry columns
   */
  static getPrimaryColumn(geoColumns: GeoColumn[]): GeoColumn | undefined {
    return geoColumns.find(({ primary }) => primary) ?? geoColumns[0];
  }

  /**
   * Returns whether a geometry column contains points only
   *
   * @param geoColumn - The geometry column
   * @returns Whether every geometry type of the column is a point
   */
  static isPointColumn(geoColumn: GeoColumn): boolean {
    return (
      geoColumn.geometryTypes.length > 0 &&
      geoColumn.geometryTypes.every((geometryType) =>
        geometryType.startsWith("Point"),
      )
    );
  }

  /**
   * Returns the coordinate columns derived from the point geometry columns
   *
   * @param geoColumns - The geometry columns of the file
   * @returns The names of the derived coordinate columns
   */
  static getCoordinateColumns(geoColumns: GeoColumn[]): string[] {
    return geoColumns
      .filter((geoColumn) => ParquetMetadataUtils.isPointColumn(geoColumn))
      .flatMap(({ name }) => [`${name}[x]`, `${name}[y]`]);
  }

  /**
   * Parses the name of a derived coordinate column
   *
   * The name is not checked against the geometry columns of any file.
   *
   * @param column - The column name to parse
   * @returns The geometry column the coordinates are read from and the axis
   * they are read on, or `undefined` if the name is not a coordinate column
   */
  static parseCoordinateColumn(
    column: string,
  ): { geometryColumn: string; axis: "x" | "y" } | undefined {
    const match = ParquetMetadataUtils._coordinateColumnPattern.exec(column);
    if (match === null) {
      return undefined;
    }
    return { geometryColumn: match[1]!, axis: match[2] === "x" ? "x" : "y" };
  }

  /**
   * Resolves a derived coordinate column to its geometry column and axis
   *
   * @param geoColumns - The geometry columns of the file
   * @param column - The column name to resolve
   * @returns The geometry column the coordinates are read from and the axis
   * they are read on, or `undefined` if the name is not a coordinate column
   * of one of the given geometry columns
   */
  static resolveCoordinateColumn(
    geoColumns: GeoColumn[],
    column: string,
  ): { geoColumn: GeoColumn; axis: "x" | "y" } | undefined {
    const coordinates = ParquetMetadataUtils.parseCoordinateColumn(column);
    if (coordinates === undefined) {
      return undefined;
    }
    const geoColumn = geoColumns.find(
      (geoColumn) =>
        geoColumn.name === coordinates.geometryColumn &&
        ParquetMetadataUtils.isPointColumn(geoColumn),
    );
    return geoColumn !== undefined
      ? { geoColumn, axis: coordinates.axis }
      : undefined;
  }

  /**
   * Reads the column a pandas DataFrame index was written as
   *
   * Parquet has no index, so pandas either writes the index as an ordinary
   * column, named in the `pandas` metadata, or, for a `RangeIndex`, writes
   * nothing and records the range instead.
   *
   * @param metadata - The file metadata
   * @returns The name of the index column, or `undefined` for files without
   * pandas metadata, and for files whose index was not written
   */
  static readIndexColumn(metadata: FileMetaData): string | undefined {
    const pandas = metadata.key_value_metadata?.find(
      ({ key }) => key === "pandas",
    );
    if (pandas?.value === undefined) {
      return undefined;
    }
    const { index_columns = [] } = JSON.parse(pandas.value) as PandasMetadata;
    return index_columns.find((column) => typeof column === "string");
  }
}

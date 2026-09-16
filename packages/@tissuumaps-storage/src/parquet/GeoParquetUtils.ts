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

/** Reads the 2D bounds of a `bbox`, which lists Z bounds too for 3D columns */
function readBBox(
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
 * Helpers for the GeoParquet metadata of a Parquet file
 *
 * Point geometry columns are read as a pair of coordinate columns named after
 * the geometry column, e.g. `geometry.x` and `geometry.y`, so that point
 * geometries can be used wherever a numeric column is expected.
 */
export class GeoParquetUtils {
  /**
   * Reads the geometry columns of a file
   *
   * @param metadata - The file metadata
   * @returns The geometry columns, in metadata order, or an empty array for
   * files without GeoParquet metadata
   */
  static readColumns(metadata: FileMetaData): GeoColumn[] {
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
        bbox: readBBox(column.bbox),
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
      .filter((geoColumn) => GeoParquetUtils.isPointColumn(geoColumn))
      .flatMap(({ name }) => [`${name}.x`, `${name}.y`]);
  }

  /**
   * Resolves a derived coordinate column to its geometry column and axis
   *
   * @param geoColumns - The geometry columns of the file
   * @param column - The column name to resolve
   * @returns The geometry column the coordinates are read from and the axis
   * they are read on, or `undefined` if the name is not a coordinate column
   */
  static resolveCoordinateColumn(
    geoColumns: GeoColumn[],
    column: string,
  ): { geoColumn: GeoColumn; axis: "x" | "y" } | undefined {
    const axis = column.endsWith(".x")
      ? "x"
      : column.endsWith(".y")
        ? "y"
        : null;
    if (axis === null) {
      return undefined;
    }
    const name = column.slice(0, -2);
    const geoColumn = geoColumns.find(
      (geoColumn) =>
        geoColumn.name === name && GeoParquetUtils.isPointColumn(geoColumn),
    );
    return geoColumn !== undefined ? { geoColumn, axis } : undefined;
  }
}

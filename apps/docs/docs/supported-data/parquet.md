---
sidebar_position: 7
---

# Parquet

The **Parquet data providers** open Parquet files as **tables**, and [GeoParquet](https://geoparquet.org/) files as **shapes**. Files are read in the browser with [hyparquet](https://hyparquet.com/), one column at a time, so a remote file needs a server that supports HTTP range requests.

## Table data source

Parquet table data sources have the `type` `"parquet"` and accept the following fields:

| Field            | Type     | Description                                                                                                                                    |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`           | `string` | Always `"parquet"`.                                                                                                                            |
| `source`         | `string` | URL or path of the Parquet file (see [Referencing data](../concepts/projects.md#referencing-data)).                                            |
| `idColumn`       | `string` | Column holding the ID of each row (see [Data model](../concepts/data-model.md)). Defaults to the [pandas index](#pandas), else to row numbers. |
| `nameColumn`     | `string` | Column holding the name of each row.                                                                                                           |
| `requestHeaders` | `object` | Extra HTTP headers sent with the request for a remote file.                                                                                    |

## Shapes data source

Parquet shapes data sources have the `type` `"parquet"` and read a [GeoParquet](#geoparquet) file. They accept the following fields:

| Field            | Type     | Description                                                                                            |
| ---------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `type`           | `string` | Always `"parquet"`.                                                                                    |
| `source`         | `string` | URL or path of the GeoParquet file (see [Referencing data](../concepts/projects.md#referencing-data)). |
| `geometryColumn` | `string` | Geometry column to read. Defaults to the primary geometry column of the file.                          |
| `idColumn`       | `string` | Column holding the ID of each shape. Defaults to the [pandas index](#pandas), else to row numbers.     |
| `nameColumn`     | `string` | Column holding the name of each shape.                                                                 |
| `requestHeaders` | `object` | Extra HTTP headers sent with the request for a remote file.                                            |
| `table`          | `string` | ID of the table annotating the shapes (see [Data model](../concepts/data-model.md)).                   |

## Supported flavors

### Vanilla

Any Parquet file can be read as a table. Its rows are keyed by row number unless `idColumn` is set.

### Pandas

Parquet has no index. [pandas](https://pandas.pydata.org/docs/development/developer.html) writes the DataFrame index as a column and names it in the `pandas` metadata of the file. pandas does not write a `RangeIndex` at all.

TissUUmaps uses the index column as the default `idColumn`. Item IDs are numbers, so only a single-level integer index is used. A string or multi-level index, or an index column missing from the file, leaves the default at row numbers.

IDs must be unique. An ID column with duplicate values is ignored with a warning, and rows are keyed by row numbers.

### GeoParquet

A [GeoParquet](https://geoparquet.org/) file describes its geometry columns in its `geo` metadata. TissUUmaps reads geometries from columns encoded as [WKB](https://libgeos.org/specifications/wkb/). Geometry columns in other encodings are read as their raw values.

Polygons and multi-polygons are read as shapes. Rows holding another geometry are skipped.

A geometry is not a value a table column can hold, and points are not shapes. A geometry column of points is therefore read as a **pair of coordinate columns** of the table: a `geometry` column adds `geometry[x]` and `geometry[y]`. They are used like any other numeric column, including as the coordinates of a [table](./table.md) point cloud. Their value range is read from the bounds in the `geo` metadata, without decoding the column.

### SpatialData

A [SpatialData](https://spatialdata.scverse.org/) shapes element is a GeoParquet file written by [GeoPandas](https://geopandas.org/), with WKB geometries. Its index is the key its tables refer to, so the pandas index keys it without configuration. Polygons are read as shapes. Circles are points with a radius column, read as a table and drawn as a point cloud (see the [example](#example)).

### Dask

A [Dask](https://www.dask.org/) DataFrame often has a partition-local index, whose values repeat across partitions. Such an index is not used as IDs (see [Pandas](#pandas)). To key the rows, set `idColumn` to a column with unique values.

## Example

A project showing the circles and the polygons of a [SpatialData](#spatialdata) store. The circles are a GeoParquet file of points with a radius, read as a table and drawn as a point cloud sized by that radius; the polygons are read as shapes:

```json title="project.tmap"
{
  "layers": [{ "id": "layer", "name": "Visium" }],
  "tables": [
    {
      "id": "spots-table",
      "name": "Spots",
      "dataSource": {
        "type": "parquet",
        "source": "shapes/spots/shapes.parquet"
      }
    }
  ],
  "points": [
    {
      "id": "spots",
      "name": "Spots",
      "layer": "layer",
      "dataSource": {
        "type": "table",
        "table": "spots-table",
        "x": "geometry[x]",
        "y": "geometry[y]"
      },
      "pointSize": { "from": { "column": "radius", "unit": "data" } }
    }
  ],
  "shapes": [
    {
      "id": "cells",
      "name": "Cell outlines",
      "layer": "layer",
      "dataSource": {
        "type": "parquet",
        "source": "shapes/cells/shapes.parquet",
        "idColumn": "instance_id"
      }
    }
  ]
}
```

## Limitations

- Columns of 64-bit integers are read as numbers, so their values have to be below 2^53. A column with a larger value fails to load rather than losing precision.
- Geometries are read from WKB columns only. Other GeoParquet encodings are read as their raw values.
- The primary geometry column is the primary one of the WKB columns: a file whose primary column is in another encoding falls back to its first WKB column.
- A geometry column that declares no geometry types is offered as coordinate columns; reading them fails if a row is not a point.
- Workspace files need an open workspace.

## API

The data provider is implemented in the [`@tissuumaps/storage`](/docs/api/@tissuumaps/storage) package as [`ParquetTableDataProvider`](/docs/api/@tissuumaps/storage/classes/ParquetTableDataProvider) and [`ParquetShapesDataProvider`](/docs/api/@tissuumaps/storage/classes/ParquetShapesDataProvider). Reading the file is delegated to [hyparquet](https://hyparquet.com/), in a worker.

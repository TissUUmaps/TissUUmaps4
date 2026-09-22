---
sidebar_position: 7
---

# Parquet

The built-in **Parquet data provider** opens Parquet files as **tables**, and [GeoParquet](https://geoparquet.org/) files as **shapes**. Files are read in the browser with [hyparquet](https://hyparquet.com/), one column at a time, so a remote file needs a server that supports HTTP range requests.

## Table data source

Parquet table data sources have the `type` `"parquet"` and accept the following fields:

| Field            | Type     | Description                                                                                                                                          |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`           | `string` | Always `"parquet"`.                                                                                                                                  |
| `source`         | `string` | URL or path of the Parquet file (see [Referencing data](../concepts/projects.md#referencing-data)).                                                  |
| `idColumn`       | `string` | Column holding the ID of each row (see [Data model](../concepts/data-model.md)). Defaults to the [pandas index](#pandas-index), else to row numbers. |
| `nameColumn`     | `string` | Column holding the name of each row.                                                                                                                 |
| `requestHeaders` | `object` | Extra HTTP headers sent with the request for a remote file.                                                                                          |

### Point geometries as coordinate columns

A geometry is not a value a table column can hold, and point geometries are not shapes. A [GeoParquet](https://geoparquet.org/) geometry column holding points is therefore read as a **pair of coordinate columns** selected from it: a `geometry` column of points adds the columns `geometry[x]` and `geometry[y]`, which are used like any other numeric column, including as the coordinates of a [table](./table.md) point cloud. Their value range is read from the bounds in the `geo` metadata, without decoding the column.

## Shapes data source

Parquet shapes data sources have the `type` `"parquet"` and accept the following fields:

| Field            | Type     | Description                                                                                              |
| ---------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `type`           | `string` | Always `"parquet"`.                                                                                      |
| `source`         | `string` | URL or path of the GeoParquet file (see [Referencing data](../concepts/projects.md#referencing-data)).   |
| `geometryColumn` | `string` | Geometry column to read. Defaults to the primary geometry column of the file.                            |
| `idColumn`       | `string` | Column holding the ID of each shape. Defaults to the [pandas index](#pandas-index), else to row numbers. |
| `nameColumn`     | `string` | Column holding the name of each shape.                                                                   |
| `requestHeaders` | `object` | Extra HTTP headers sent with the request for a remote file.                                              |
| `table`          | `string` | ID of the table annotating the shapes (see [Data model](../concepts/data-model.md)).                     |

Polygons and multi-polygons are read as shapes; rows holding another geometry are skipped.

### GeoParquet geometries

A [GeoParquet](https://geoparquet.org/) file describes its geometry columns in the `geo` metadata of the file, and stores their geometries as [WKB](https://libgeos.org/specifications/wkb/). Geometry columns in other encodings are read as their raw values. A column holding points is not read as shapes but as a pair of columns of the table data source, see [Point geometries as coordinate columns](#point-geometries-as-coordinate-columns).

## Pandas index

Parquet has no index, so a file written by [pandas](https://pandas.pydata.org/docs/development/developer.html) or [GeoPandas](https://geopandas.org/) records in its `pandas` metadata which column its DataFrame index was written as. That column is the default `idColumn`, so that a [SpatialData](https://spatialdata.scverse.org/) element, whose index is the key its tables refer to, is keyed without configuration.

Only a single-level integer index is used: IDs are numbers, so a string index leaves the default at row numbers, as do a multi-level index and a `RangeIndex`, which is not written as a column at all.

## Example

A project showing the circles and the polygons of a [SpatialData](https://spatialdata.scverse.org/) store. The circles are a GeoParquet file of points with a radius, read as a table and drawn as a point cloud sized by that radius; the polygons are read as shapes:

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
- A geometry column that declares no geometry types is offered as coordinate columns; reading them fails if a row is not a point.
- Workspace files need an open workspace.

## API

The data provider is implemented in the [`@tissuumaps/storage`](/docs/api/@tissuumaps/storage) package as [`ParquetTableDataProvider`](/docs/api/@tissuumaps/storage/classes/ParquetTableDataProvider) and [`ParquetShapesDataProvider`](/docs/api/@tissuumaps/storage/classes/ParquetShapesDataProvider). Reading the file is delegated to [hyparquet](https://hyparquet.com/), in a worker.

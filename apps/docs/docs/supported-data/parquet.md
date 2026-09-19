---
sidebar_position: 7
---

# Parquet

The built-in **Parquet data provider** opens Parquet files as **tables**, and [GeoParquet](https://geoparquet.org/) files as **shapes**. Files are read in the browser with [hyparquet](https://hyparquet.com/), one column at a time, so a remote file needs a server that supports HTTP range requests.

## Table data source

Parquet table data sources have the `type` `"parquet"` and accept the following fields:

| Field        | Type     | Description                                                                                                                    |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `type`       | `string` | Always `"parquet"`.                                                                                                            |
| `url`        | `string` | URL of a remote Parquet file, absolute or relative (see [Referencing data](../concepts/projects.md#referencing-data)).         |
| `path`       | `string` | Path of a Parquet file relative to the workspace directory (see [Referencing data](../concepts/projects.md#referencing-data)). |
| `idColumn`   | `string` | Column holding the ID of each row (see [Data model](../concepts/data-model.md)). Row numbers are used when it is not given.    |
| `nameColumn` | `string` | Column holding the name of each row.                                                                                           |

Either `url` or `path` has to be given. When a workspace is open and both are given, `path` takes precedence.

Columns of 64-bit integers are not supported, as their values do not fit a JavaScript number.

## Shapes data source

GeoParquet shapes data sources have the `type` `"geoparquet"` and accept the following fields:

| Field            | Type     | Description                                                                          |
| ---------------- | -------- | ------------------------------------------------------------------------------------ |
| `type`           | `string` | Always `"geoparquet"`.                                                               |
| `url`            | `string` | URL of a remote GeoParquet file, absolute or relative.                               |
| `path`           | `string` | Path of a GeoParquet file relative to the workspace directory.                       |
| `geometryColumn` | `string` | Geometry column to read. Defaults to the primary geometry column of the file.        |
| `idColumn`       | `string` | Column holding the ID of each shape. Row numbers are used when it is not given.      |
| `nameColumn`     | `string` | Column holding the name of each shape.                                               |
| `table`          | `string` | ID of the table annotating the shapes (see [Data model](../concepts/data-model.md)). |

Polygons and multi-polygons are read as shapes; rows holding another geometry are skipped.

## GeoParquet

A GeoParquet file describes its geometry columns in the `geo` metadata of the file, and stores their geometries as [WKB](https://libgeos.org/specifications/wkb/). Geometry columns in other encodings are read as their raw values.

Point geometries are not shapes, and a geometry is not a value a table column can hold. A geometry column holding points is therefore read as a **pair of coordinate columns** named after it: a `geometry` column of points adds the columns `geometry.x` and `geometry.y`, which are used like any other numeric column — including as the coordinates of a [table](./table.md) point cloud. Their value range is read from the bounds in the `geo` metadata, without decoding the column.

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
        "url": "shapes/spots/shapes.parquet"
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
        "x": "geometry.x",
        "y": "geometry.y"
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
        "type": "geoparquet",
        "url": "shapes/cells/shapes.parquet",
        "idColumn": "instance_id"
      }
    }
  ]
}
```

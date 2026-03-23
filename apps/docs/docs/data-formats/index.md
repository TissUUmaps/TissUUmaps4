# Data formats

The following table lists capabitilites of built-in storage adapters.

| Storage adapter                  | Images        | Labels        | Points          | Shapes           | Tables           |
| -------------------------------- | ------------- | ------------- | --------------- | ---------------- | ---------------- |
| [OpenSeadragon](./openseadragon) | Tile source   |               |                 |                  |                  |
| [TIFF](./tiff)                   | TIFF URL/path | TIFF URL/path |                 |                  |                  |
| [Zarr](./zarr)                   | Zarr URL/path | Zarr URL/path |                 |                  |                  |
| [Table](./table)                 |               |               | Table reference | Table reference  |                  |
| [GeoJSON](./geojson)             |               |               |                 | GeoJSON URL/path |                  |
| [CSV](./csv)                     |               |               |                 |                  | CSV URL/path     |
| [Parquet](./parquet)             |               |               |                 |                  | Parquet URL/path |

Additional data formats may be supported by third-party storage adapters.

---
sidebar_position: 9
---

# Zarr

Tables stored in [Zarr](https://zarr.dev/) stores, including the AnnData tables of [SpatialData](https://spatialdata.scverse.org/) stores. Images of a Zarr store are read by the [OME-Zarr](./ome-zarr) data provider instead.

Columns are addressed as in [HDF5](./hdf5) files: a column is the path of an array within the store, and one column of a matrix is `path[i]`, or `path[name]` for an AnnData expression matrix. AnnData objects are recognized and decoded the same way, whether the source points at one or at a store containing them.

## Data source

Zarr data sources have the `type` `"zarr"` and accept the following fields:

| Field        | Type     | Description                                                                                                                     |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `type`       | `string` | Always `"zarr"`.                                                                                                                |
| `source`     | `string` | URL of the store, or path of its directory in the workspace (see [Referencing data](../concepts/projects.md#referencing-data)). |
| `idColumn`   | `string` | Column of the row IDs. Sequential IDs are used if omitted.                                                                      |
| `nameColumn` | `string` | Column of the row names.                                                                                                        |

## The source

The source may point at the store itself, or at a group inside it. A SpatialData table is a group of the store, so both of these work:

- `https://example.org/visium.zarr/tables/adata`, whose columns are `obs/area`, `obsm/spatial[0]`, and so on.
- `https://example.org/visium.zarr`, whose columns are `tables/adata/obs/area`, and so on.

Consolidated metadata is written at the root of a store, so it is looked up at the source and then at each of its ancestors. The same holds for a directory in the workspace.

## Limitations

- The store must have consolidated metadata (`.zmetadata`). A Zarr store is a key-value store, so without it the columns cannot be listed. SpatialData writes consolidated metadata.
- Nodes whose metadata cannot be read are skipped instead of failing the store. AnnData writes a few of them under `uns`.
- Sparse matrices must be stored in CSC format, as for HDF5. AnnData writes `X` as CSR by default.

## API

The data provider is implemented in the [`@tissuumaps/storage`](/docs/api/@tissuumaps/storage) package as [`ZarrTableDataProvider`](/docs/api/@tissuumaps/storage/classes/ZarrTableDataProvider). Reading the store is delegated to [zarrita](https://github.com/manzt/zarrita.js).

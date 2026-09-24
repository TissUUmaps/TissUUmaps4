---
sidebar_position: 8
---

# HDF5

Tables stored in HDF5 files, including [AnnData](https://anndata.readthedocs.io/) `.h5ad` files.

An [AnnData object](#anndata-files) is recognized by its `encoding-type` attribute, wherever it sits in the file. Plain HDF5 files are read as their datasets.

## Data source

HDF5 data sources have the `type` `"hdf5"` and accept the following fields:

| Field        | Type     | Description                                                                                      |
| ------------ | -------- | ------------------------------------------------------------------------------------------------ |
| `type`       | `string` | Always `"hdf5"`.                                                                                 |
| `source`     | `string` | URL or path of the HDF5 file (see [Referencing data](../concepts/projects.md#referencing-data)). |
| `idColumn`   | `string` | Column of the row IDs. Sequential IDs are used if omitted.                                       |
| `nameColumn` | `string` | Column of the row names.                                                                         |

## Columns

A column is addressed by the path of a dataset within the file, for example `obs/area`. Column inputs offer autocompletion: an empty query lists the root of the file, and a query ending in `/` lists the children of that group. Paths are matched exactly, or ignoring case if that matches a single column.

- One-dimensional datasets are columns.
- Two-dimensional datasets expose one column per matrix column as `path[i]`, for example `obsm/spatial[0]` and `obsm/spatial[1]` for spatial coordinates.

## AnnData files

A group whose `encoding-type` attribute is `anndata` is an AnnData object, and its columns are decoded:

- Sparse matrices expose one column per matrix column, as two-dimensional datasets do.
- `X`, the `layers` and their `raw` counterparts are addressed by variable name as well as by index, for example `X[CD3]` besides `X[12]`. The names are the index of the `var` dataframe of the object, and `raw/var` for `raw/X`. Names are matched exactly, or ignoring case if that matches a single name. A number between the brackets is always an index, so numeric and duplicate names are addressed by index.
- `categorical` groups are columns of the category type; missing values are empty strings for string categories and `NaN` for numeric ones.
- `nullable-integer` and `nullable-boolean` groups are numeric columns; missing values are `NaN`.
- `nullable-string-array` groups are string columns; missing values are empty strings.
- The number of rows is the length of the `obs` index.

## Limitations

- Sparse matrices must be stored in CSC format (`csc_matrix`). Reading one column of a CSR matrix would require the whole matrix, so CSR matrices are rejected.
- 64-bit integer columns are read as numbers; a value beyond ±2⁵³ is rejected rather than rounded.
- HDF5 files do not store a row count. The number of rows is taken from the ID column if given, otherwise from the name column, otherwise from the AnnData `obs` index, otherwise from the first column of the file.
- Variable names are only read for AnnData objects. A `var` dataframe whose index is as long as the matrix is required; otherwise the matrix keeps its column indices.
- Remote files are read through HTTP range requests. The server must send `Accept-Ranges: bytes` and, for cross-origin requests, expose it via `Access-Control-Expose-Headers`; otherwise the whole file is downloaded before the first read.
- A column must have as many rows as the table.

## API

The data provider is implemented in the [`@tissuumaps/storage`](/docs/api/@tissuumaps/storage) package as [`HDF5TableDataProvider`](/docs/api/@tissuumaps/storage/classes/HDF5TableDataProvider). Reading the file is delegated to [h5wasm](https://github.com/usnistgov/h5wasm), in a Web Worker (see [Dependencies](../development/dependencies.md)).

import {
  type GenericArray,
  MathUtils,
  NumberUtils,
  type NumericArray,
} from "@tissuumaps/core";

import { ColumnQueryUtils } from "./ColumnQueryUtils";
import type {
  HierarchicalStore,
  HierarchicalStoreArray,
  HierarchicalStoreGroup,
  HierarchicalStoreValues,
} from "./HierarchicalStore";
import type {
  HierarchicalTable,
  HierarchicalTableColumn,
} from "./HierarchicalTable";

/** Data types whose values can be used as a column */
const readableDataTypes = new Set(["integer", "float", "string", "boolean"]);

/** Category labels of an AnnData file (anndata < 0.8), never a column */
const legacyCategoriesGroupName = "__categories";

/** Brackets, which a column query cannot address in a path */
const bracketPattern = /[[\]]/;

/**
 * Paths of the matrices named by the `var` index of their AnnData object,
 * relative to that object
 */
const variableMatrixPattern = /^(raw\/)?(X|layers\/[^/]+)$/;

/**
 * Reads columns from a {@link HierarchicalStore}, understanding the AnnData on-disk
 * encoding (`encoding-type` attributes) where present
 *
 * Any 1-D array is a column and any 2-D array is a matrix. Groups carrying an
 * AnnData `encoding-type` attribute are decoded wherever they are. The
 * AnnData object of the store, if any, also gives the row count of its `obs`
 * index and the column selectors of its expression matrices.
 */
export class HierarchicalTableReader implements HierarchicalTable {
  readonly columns: HierarchicalTableColumn[];
  readonly numRows: number;
  private readonly _store: HierarchicalStore;

  private constructor(
    store: HierarchicalStore,
    columns: HierarchicalTableColumn[],
    numRows: number,
  ) {
    this._store = store;
    this.columns = columns;
    this.numRows = numRows;
  }

  /**
   * Lists the columns of a store and infers its row count
   *
   * Groups are walked recursively, except groups encoded as a column or a
   * matrix. Scalars, arrays of more than two dimensions, arrays of non-scalar
   * types and nodes whose name contains a bracket are skipped.
   *
   * The row count is the length of the `obs` index of the AnnData object,
   * otherwise the first column's.
   *
   * @param store - The store to read from; closed by
   * {@link HierarchicalTable.close}, or here if this method rejects
   * @param options - Optional abort signal
   * @returns The reader
   * @throws Error if the store has no root group, no columns or more than one
   * AnnData object, or if the node that gives the row count is not a column
   */
  static async open(
    store: HierarchicalStore,
    options?: { signal?: AbortSignal },
  ): Promise<HierarchicalTableReader> {
    const { signal } = options ?? {};
    try {
      signal?.throwIfAborted();
      const root = await store.get("", { signal });
      if (root === null || root.kind !== "group") {
        throw new Error("The store has no root group.");
      }
      const columns: HierarchicalTableColumn[] = [];
      const annDataPaths = getEncodingType(root) === "anndata" ? [""] : [];
      await collectColumns(store, root, "", columns, annDataPaths, { signal });
      if (annDataPaths.length > 1) {
        throw new Error(
          `The store holds ${annDataPaths.length} AnnData objects (${annDataPaths.map((path) => `"/${path}"`).join(", ")}); point the source at one of them.`,
        );
      }
      const annDataPath = annDataPaths[0];
      const numRows = await inferNumRows(store, columns, annDataPath, {
        signal,
      });
      await readMatrixSelectors(store, columns, annDataPath, { signal });
      return new HierarchicalTableReader(store, columns, numRows);
    } catch (error) {
      store.close();
      throw error;
    }
  }

  /**
   * Reads the values of a column
   *
   * 64-bit integers are converted to numbers.
   *
   * @param query - The column query (see {@link ColumnQueryUtils})
   * @param options - The number of table rows, checked against the column
   * length, and an abort signal
   * @returns The column values
   * @throws Error if the query addresses no column, if the column length
   * differs from the number of table rows, if the matrix is stored as CSR, if
   * a dataset of the column's encoding is missing, or if a 64-bit integer is
   * outside the safe integer range
   */
  async readColumn(
    query: string,
    options?: { numRows?: number; signal?: AbortSignal },
  ): Promise<GenericArray<unknown>> {
    const { numRows, signal } = options ?? {};
    signal?.throwIfAborted();
    const resolved = ColumnQueryUtils.resolveColumn(this.columns, query);
    if (resolved === null) {
      throw new Error(`Column query "${query}" addresses no column`);
    }
    const { column, index } = resolved;
    const values = await readColumnValues(this._store, column.path, index, {
      signal,
    });
    if (numRows !== undefined && values.length !== numRows) {
      throw new Error(
        `Column "${query}" has ${values.length} rows, but the table has ${numRows}`,
      );
    }
    return values;
  }

  /**
   * Reads the minimum and maximum value of a numeric column
   *
   * @param query - The column query (see {@link ColumnQueryUtils})
   * @param options - See {@link HierarchicalTableReader.readColumn}
   * @returns The [min, max] range, or `undefined` if the column is not numeric
   * or holds no two distinct finite values
   * @throws Error see {@link HierarchicalTableReader.readColumn}
   */
  async readRange(
    query: string,
    options?: { numRows?: number; signal?: AbortSignal },
  ): Promise<[number, number] | undefined> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const values = await this.readColumn(query, options);
    if (typeof values[0] !== "number") {
      return undefined;
    }
    const [vmin, vmax] = await MathUtils.computeRange(values as NumericArray, {
      signal,
    });
    return vmin < vmax ? [vmin, vmax] : undefined;
  }

  /** Closes the store */
  close(): void {
    this._store.close();
  }
}

async function collectColumns(
  store: HierarchicalStore,
  group: HierarchicalStoreGroup,
  prefix: string,
  columns: HierarchicalTableColumn[],
  annDataPaths: string[],
  options?: { signal?: AbortSignal },
): Promise<void> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  // sorted, as a store may list its nodes in write order
  for (const name of group.keys.toSorted()) {
    if (name === legacyCategoriesGroupName || bracketPattern.test(name)) {
      continue;
    }
    const path = `${prefix}${name}`;
    const node = await store.get(path, { signal });
    if (node === null) {
      continue;
    }
    if (node.kind === "group") {
      const encodingType = getEncodingType(node);
      switch (encodingType) {
        case "categorical":
        case "nullable-integer":
        case "nullable-boolean":
        case "nullable-string-array":
          columns.push({ kind: "dataset", path });
          break;
        case "csc_matrix":
        case "csr_matrix": {
          const shape = getShapeAttribute(node);
          if (shape !== undefined) {
            columns.push({ kind: "matrix", path, numColumns: shape[1]! });
          }
          break;
        }
        default:
          if (encodingType === "anndata") {
            annDataPaths.push(path);
          }
          await collectColumns(store, node, `${path}/`, columns, annDataPaths, {
            signal,
          });
      }
    } else {
      const { shape, dataType } = node;
      if (!readableDataTypes.has(dataType)) {
        continue;
      }
      if (shape.length === 1) {
        columns.push({ kind: "dataset", path });
      } else if (shape.length === 2) {
        columns.push({ kind: "matrix", path, numColumns: shape[1]! });
      }
    }
  }
}

async function inferNumRows(
  store: HierarchicalStore,
  columns: HierarchicalTableColumn[],
  annDataPath: string | undefined,
  options?: { signal?: AbortSignal },
): Promise<number> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  if (annDataPath !== undefined) {
    const indexPath = await getDataFrameIndexPath(
      store,
      joinPath(annDataPath, "obs"),
      { signal },
    );
    if (indexPath !== undefined) {
      return await getNumRows(store, indexPath, { signal });
    }
  }
  const firstColumn = columns[0];
  if (firstColumn === undefined) {
    throw new Error("No columns found in the store.");
  }
  return await getNumRows(store, firstColumn.path, { signal });
}

async function getNumRows(
  store: HierarchicalStore,
  path: string,
  options?: { signal?: AbortSignal },
): Promise<number> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const node = await store.get(path, { signal });
  if (node === null) {
    throw new Error(`Column "${path}" does not exist`);
  }
  if (node.kind === "array") {
    return node.shape[0]!;
  }
  switch (getEncodingType(node)) {
    case "categorical":
      return (await getChildArray(store, path, "codes", { signal })).shape[0]!;
    case "nullable-integer":
    case "nullable-boolean":
    case "nullable-string-array":
      return (await getChildArray(store, path, "values", { signal })).shape[0]!;
    default: {
      const shape = getShapeAttribute(node);
      if (shape === undefined) {
        throw new Error(`"${path}" is a group, not a column`);
      }
      return shape[0]!;
    }
  }
}

/**
 * Reads the values of a column
 *
 * @param store - The store to read from
 * @param path - The path of the column
 * @param index - The index of the matrix column, `undefined` for a dataset
 * column
 * @param options - Optional abort signal
 * @returns The column values, with 64-bit integers converted to numbers
 * @throws Error if the path addresses no column, if the matrix is stored as
 * CSR, if a dataset of the column's encoding is missing, or if a 64-bit
 * integer is outside the safe integer range
 */
async function readColumnValues(
  store: HierarchicalStore,
  path: string,
  index: number | undefined,
  options?: { signal?: AbortSignal },
): Promise<GenericArray<unknown>> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const node = await store.get(path, { signal });
  if (node === null) {
    throw new Error(`Column "${path}" does not exist`);
  }
  if (node.kind === "array") {
    return toNumbersIfInt64(
      index === undefined
        ? await node.read({ signal })
        : await node.slice([null, [index, index + 1]], { signal }),
    );
  }
  switch (getEncodingType(node)) {
    case "categorical":
      return await readCategorical(store, path, { signal });
    case "nullable-integer":
    case "nullable-boolean":
      return await readNullable(store, path, { signal });
    case "nullable-string-array":
      return await readNullableStrings(store, path, { signal });
    case "csc_matrix":
      return await readSparseColumn(store, node, path, index!, { signal });
    case "csr_matrix":
      throw new Error(
        `Matrix "${path}" is stored as CSR; only CSC matrices support column reads`,
      );
    default:
      throw new Error(`"${path}" is a group, not a column`);
  }
}

/**
 * Converts 64-bit integers, which read as `BigInt64Array`, to numbers
 *
 * @param values - The values to convert
 * @returns The values, as numbers if they were 64-bit integers
 * @throws Error if a 64-bit integer is outside the safe integer range
 */
function toNumbersIfInt64(
  values: HierarchicalStoreValues,
): GenericArray<unknown> {
  if (values instanceof BigInt64Array || values instanceof BigUint64Array) {
    return Float64Array.from(values, (v) => NumberUtils.parseSafeInt(v));
  }
  return values;
}

function getEncodingType(group: HierarchicalStoreGroup): string | undefined {
  const value = group.attrs["encoding-type"];
  return typeof value === "string" ? value : undefined;
}

/**
 * Gives the AnnData expression matrices the selectors of their `var` index
 *
 * `X` and the `layers` of an AnnData object have one column per variable, so
 * they can be addressed by variable name, such as `X[CD3]`. A `var` index
 * that cannot be read, or whose length does not match the matrix, leaves the
 * matrix with its column indices.
 *
 * @param store - The store to read from
 * @param columns - The columns to name, modified in place
 * @param annDataPath - The path of the AnnData object of the store, if any
 * @param options - Optional abort signal
 */
async function readMatrixSelectors(
  store: HierarchicalStore,
  columns: HierarchicalTableColumn[],
  annDataPath: string | undefined,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  if (annDataPath === undefined) {
    return;
  }
  const selectorsByPath = new Map<string, string[] | undefined>();
  for (const column of columns) {
    if (column.kind !== "matrix") {
      continue;
    }
    const varPath = getVariableDataFramePath(column.path, annDataPath);
    if (varPath === undefined) {
      continue;
    }
    if (!selectorsByPath.has(varPath)) {
      const names = await readDataFrameIndex(store, varPath, { signal });
      selectorsByPath.set(
        varPath,
        names !== undefined
          ? ColumnQueryUtils.getMatrixSelectors(names)
          : undefined,
      );
    }
    const selectors = selectorsByPath.get(varPath);
    if (selectors !== undefined && selectors.length === column.numColumns) {
      column.selectors = selectors;
    }
  }
}

/**
 * @param path - The path of a matrix column
 * @param annDataPath - The path of the AnnData object of the store
 * @returns The path of the `var` dataframe naming the columns of the matrix,
 * or `undefined` if the matrix is not an expression matrix of the object
 */
function getVariableDataFramePath(
  path: string,
  annDataPath: string,
): string | undefined {
  if (annDataPath !== "" && !path.startsWith(`${annDataPath}/`)) {
    return undefined;
  }
  const match = variableMatrixPattern.exec(
    annDataPath === "" ? path : path.slice(annDataPath.length + 1),
  );
  return match !== null
    ? joinPath(annDataPath, `${match[1] ?? ""}var`)
    : undefined;
}

/**
 * Reads the index values of an AnnData dataframe
 *
 * @param store - The store to read from
 * @param path - The path of the dataframe group
 * @param options - Optional abort signal
 * @returns The index values as strings, or `undefined` if the dataframe or
 * its index cannot be read
 */
async function readDataFrameIndex(
  store: HierarchicalStore,
  path: string,
  options?: { signal?: AbortSignal },
): Promise<string[] | undefined> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const indexPath = await getDataFrameIndexPath(store, path, { signal });
  if (indexPath === undefined) {
    return undefined;
  }
  try {
    const values = await readColumnValues(store, indexPath, undefined, {
      signal,
    });
    return Array.from(values, String);
  } catch {
    signal?.throwIfAborted();
    // an index this reader cannot decode only costs the matrix its names
    return undefined;
  }
}

/**
 * @param store - The store to read from
 * @param path - The path of the dataframe group
 * @param options - Optional abort signal
 * @returns The path of the index of the dataframe, or `undefined` if the
 * group is no dataframe or names no index
 */
async function getDataFrameIndexPath(
  store: HierarchicalStore,
  path: string,
  options?: { signal?: AbortSignal },
): Promise<string | undefined> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const group = await store.get(path, { signal });
  if (
    group === null ||
    group.kind !== "group" ||
    getEncodingType(group) !== "dataframe"
  ) {
    return undefined;
  }
  const indexName = group.attrs["_index"];
  return typeof indexName === "string" ? joinPath(path, indexName) : undefined;
}

/**
 * @param prefix - The path of the parent, empty for the root
 * @param name - The path below the parent
 * @returns The joined path
 */
function joinPath(prefix: string, name: string): string {
  return prefix !== "" ? `${prefix}/${name}` : name;
}

function getShapeAttribute(
  group: HierarchicalStoreGroup,
): number[] | undefined {
  const value = group.attrs["shape"];
  if (value === undefined || value === null || typeof value !== "object") {
    return undefined;
  }
  const shape = Array.from(value as ArrayLike<number | bigint>, Number);
  return shape.length === 2 ? shape : undefined;
}

async function getChildArray(
  store: HierarchicalStore,
  path: string,
  name: string,
  options?: { signal?: AbortSignal },
): Promise<HierarchicalStoreArray> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const child = await store.get(`${path}/${name}`, { signal });
  if (child === null || child.kind !== "array") {
    throw new Error(`Column "${path}" is missing its "${name}" dataset`);
  }
  return child;
}

async function readChildArray(
  store: HierarchicalStore,
  path: string,
  name: string,
  options?: { signal?: AbortSignal },
): Promise<GenericArray<unknown>> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const child = await getChildArray(store, path, name, { signal });
  return toNumbersIfInt64(await child.read({ signal }));
}

async function readCategorical(
  store: HierarchicalStore,
  path: string,
  options?: { signal?: AbortSignal },
): Promise<string[] | Float64Array> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const codes = (await readChildArray(store, path, "codes", {
    signal,
  })) as ArrayLike<number>;
  const categories = await readChildArray(store, path, "categories", {
    signal,
  });
  if (Array.isArray(categories)) {
    const labels = categories as string[];
    return Array.from(codes, (code) => (code < 0 ? "" : labels[code]!));
  }
  const numericCategories = categories as ArrayLike<number>;
  return Float64Array.from(codes, (code) =>
    code < 0 ? NaN : numericCategories[code]!,
  );
}

/**
 * Reads a nullable string column
 *
 * @param store - The store to read from
 * @param path - The path of the column group
 * @param options - Optional abort signal
 * @returns The values, with the masked ones as empty strings
 */
async function readNullableStrings(
  store: HierarchicalStore,
  path: string,
  options?: { signal?: AbortSignal },
): Promise<string[]> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const values = (await readChildArray(store, path, "values", {
    signal,
  })) as ArrayLike<unknown>;
  const mask = (await readChildArray(store, path, "mask", {
    signal,
  })) as ArrayLike<number | boolean>;
  return Array.from(values, (value, i) => (mask[i] ? "" : String(value)));
}

async function readNullable(
  store: HierarchicalStore,
  path: string,
  options?: { signal?: AbortSignal },
): Promise<Float64Array> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const values = (await readChildArray(store, path, "values", {
    signal,
  })) as ArrayLike<number | boolean>;
  const mask = (await readChildArray(store, path, "mask", {
    signal,
  })) as ArrayLike<number | boolean>;
  return Float64Array.from(values, (value, i) =>
    mask[i] ? NaN : Number(value),
  );
}

async function readSparseColumn(
  store: HierarchicalStore,
  group: HierarchicalStoreGroup,
  path: string,
  index: number,
  options?: { signal?: AbortSignal },
): Promise<Float64Array> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const shape = getShapeAttribute(group);
  if (shape === undefined) {
    throw new Error(`Matrix "${path}" has no two-dimensional shape attribute`);
  }
  const indptr = await getChildArray(store, path, "indptr", { signal });
  const bounds = toNumbersIfInt64(
    await indptr.slice([[index, index + 2]], { signal }),
  ) as ArrayLike<number>;
  const range: [number, number] = [bounds[0]!, bounds[1]!];
  const data = await getChildArray(store, path, "data", { signal });
  const values = toNumbersIfInt64(
    await data.slice([range], { signal }),
  ) as ArrayLike<number | boolean>;
  const indices = await getChildArray(store, path, "indices", { signal });
  const rows = toNumbersIfInt64(
    await indices.slice([range], { signal }),
  ) as ArrayLike<number>;
  const column = new Float64Array(shape[0]!);
  for (let i = 0; i < rows.length; i++) {
    column[rows[i]!] = Number(values[i]);
  }
  return column;
}

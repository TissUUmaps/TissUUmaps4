import type { TableColumnQuerySuggestion } from "@tissuumaps/core";

import type { HierarchicalTableColumn } from "./HierarchicalTable";

/** A matrix column, the only kind a bracketed selector can address */
type MatrixColumn = Extract<HierarchicalTableColumn, { kind: "matrix" }>;

/**
 * Column query parsing, suggestion and resolution for hierarchical tables
 *
 * A column query is a path such as `obs/area`, optionally followed by a
 * bracketed selector for matrix columns, such as `obsm/spatial[0]`. The
 * selector is a column index, or one of the column's selectors where the
 * matrix has them, such as `X[CD3]` for an AnnData expression matrix. A
 * leading slash is accepted and ignored.
 *
 * Paths and selectors are matched exactly, or else ignoring case if that
 * matches exactly one of them.
 */
export class ColumnQueryUtils {
  /**
   * Maximum number of `path[selector]` queries suggested for one matrix column
   *
   * An AnnData expression matrix has tens of thousands of columns.
   */
  private static readonly _maxSuggestedMatrixColumns = 100;

  /**
   * A path, optionally with a leading slash and followed by a bracketed
   * selector
   */
  private static readonly _columnQueryPattern =
    /^\/?([^[\]]*?)(?:\[([^[\]]*)\])?$/;

  /** A selector that is a column index rather than a column name */
  private static readonly _indexSelectorPattern = /^\d+$/;

  /** Brackets, which delimit the selector of a column query */
  private static readonly _bracketPattern = /[[\]]/;

  /**
   * Whether a name can be part of a column query, as a path segment or as a
   * selector
   *
   * @param name - The name of a node or of a matrix column
   * @returns Whether the name contains no bracket
   */
  static isQueryableName(name: string): boolean {
    return !ColumnQueryUtils._bracketPattern.test(name);
  }

  /**
   * Derives the selectors of the columns of a matrix from their names
   *
   * A name is its column's selector if it is unique, non-empty, not a number
   * and free of brackets; any other column is selected by its index. A
   * numeric selector then always means an index.
   *
   * @param names - The name of each matrix column
   * @returns The selector of each matrix column
   */
  static getMatrixSelectors(names: string[]): string[] {
    const counts = new Map<string, number>();
    for (const name of names) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return names.map((name, i) =>
      name === "" ||
      ColumnQueryUtils._indexSelectorPattern.test(name) ||
      !ColumnQueryUtils.isQueryableName(name) ||
      counts.get(name)! > 1
        ? String(i)
        : name,
    );
  }

  /**
   * Resolves a column query to the column it addresses
   *
   * @param columns - The columns of the table
   * @param query - The column query
   * @returns The column and, for a matrix column, the index of the selected
   * matrix column; `null` if the query addresses no column
   */
  static resolveColumn(
    columns: HierarchicalTableColumn[],
    query: string,
  ): { column: HierarchicalTableColumn; index: number | undefined } | null {
    const match = ColumnQueryUtils._columnQueryPattern.exec(query);
    if (match === null) {
      return null;
    }
    const [, path, selector] = match;
    const column =
      columns[
        ColumnQueryUtils._findMatchIndex(
          columns.map((column) => column.path),
          path!,
        )
      ];
    if (column === undefined) {
      return null;
    }
    if (column.kind === "dataset") {
      return selector === undefined ? { column, index: undefined } : null;
    }
    if (selector === undefined) {
      return null;
    }
    const index = ColumnQueryUtils._resolveMatrixSelector(column, selector);
    return index !== undefined ? { column, index } : null;
  }

  /**
   * Resolves a column query to its canonical form
   *
   * @param columns - The columns of the table
   * @param query - The column query
   * @returns The canonical query (`path` for dataset columns, `path[selector]`
   * for matrix columns), or `null` if the query addresses no column
   */
  static resolveColumnQuery(
    columns: HierarchicalTableColumn[],
    query: string,
  ): string | null {
    const resolved = ColumnQueryUtils.resolveColumn(columns, query);
    if (resolved === null) {
      return null;
    }
    const { column, index } = resolved;
    if (column.kind === "dataset") {
      return column.path;
    }
    return `${column.path}[${column.selectors?.[index!] ?? index}]`;
  }

  /**
   * Suggests column queries matching the current query
   *
   * The children of the query's parent path whose name contains its partial
   * name, ignoring case, are suggested: groups with a trailing slash, dataset
   * columns as their path, and matrix columns as the `path[selector]` queries
   * matching the typed selector.
   *
   * Groups and matrix columns suggested without a selector are group
   * suggestions: a group continues into its children, a matrix column into
   * its bracket.
   *
   * @param columns - The columns of the table
   * @param currentQuery - The partial column query
   * @returns The suggested column queries, in path order
   */
  static suggestColumnQueries(
    columns: HierarchicalTableColumn[],
    currentQuery: string,
  ): TableColumnQuerySuggestion[] {
    const query = currentQuery.startsWith("/")
      ? currentQuery.slice(1)
      : currentQuery;
    const bracket = query.indexOf("[");
    const path = bracket >= 0 ? query.slice(0, bracket) : query;
    const partialSelector =
      bracket >= 0 ? query.slice(bracket + 1).replace("]", "") : undefined;
    const lastSlash = path.lastIndexOf("/");
    const prefix = path.slice(0, lastSlash + 1).toLowerCase();
    const partialName = path.slice(lastSlash + 1).toLowerCase();

    const suggestions: TableColumnQuerySuggestion[] = [];
    const seenNames = new Set<string>();
    for (const column of columns) {
      if (!column.path.toLowerCase().startsWith(prefix)) {
        continue;
      }
      const columnPrefix = column.path.slice(0, prefix.length);
      const rest = column.path.slice(prefix.length);
      const slash = rest.indexOf("/");
      const name = slash >= 0 ? rest.slice(0, slash) : rest;
      if (seenNames.has(name)) {
        continue;
      }
      const nameMatches =
        partialSelector === undefined &&
        name.toLowerCase().includes(partialName);
      if (slash >= 0) {
        if (nameMatches) {
          seenNames.add(name);
          suggestions.push({ query: `${columnPrefix}${name}/`, group: true });
        }
      } else if (
        column.kind === "matrix" &&
        name.toLowerCase() === partialName
      ) {
        seenNames.add(name);
        suggestions.push(
          ...ColumnQueryUtils._suggestMatrixColumns(column, partialSelector),
        );
      } else if (nameMatches) {
        seenNames.add(name);
        // a matrix column only addresses a column with a bracketed selector
        suggestions.push(
          column.kind === "matrix"
            ? { query: column.path, group: true }
            : { query: column.path },
        );
      }
    }
    return suggestions;
  }

  /**
   * Finds a key exactly, or else ignoring case if exactly one key matches that
   * way
   *
   * @param keys - The keys to search
   * @param key - The key to find
   * @returns The index of the matching key, or -1 if there is none
   */
  private static _findMatchIndex(keys: string[], key: string): number {
    const exactIndex = keys.indexOf(key);
    if (exactIndex >= 0) {
      return exactIndex;
    }
    const lowerCaseKey = key.toLowerCase();
    let matchIndex = -1;
    for (let i = 0; i < keys.length; i++) {
      if (keys[i]!.toLowerCase() === lowerCaseKey) {
        if (matchIndex >= 0) {
          return -1;
        }
        matchIndex = i;
      }
    }
    return matchIndex;
  }

  /**
   * Resolves the selector of a matrix column to a column index
   *
   * @param column - The matrix column
   * @param selector - The bracketed selector of the query
   * @returns The column index, or `undefined` if the selector addresses no
   * column of the matrix
   */
  private static _resolveMatrixSelector(
    column: MatrixColumn,
    selector: string,
  ): number | undefined {
    if (ColumnQueryUtils._indexSelectorPattern.test(selector)) {
      const index = Number(selector);
      return index < column.numColumns ? index : undefined;
    }
    const { selectors } = column;
    if (selectors === undefined) {
      return undefined;
    }
    const index = ColumnQueryUtils._findMatchIndex(selectors, selector);
    return index >= 0 ? index : undefined;
  }

  /**
   * Suggests the columns of a matrix
   *
   * Columns with selectors are matched by their selector, ignoring case, the
   * others by the digits of their index, so that a partial name narrows the tens
   * of thousands of columns of an expression matrix.
   *
   * @param column - The matrix column
   * @param partialSelector - The partially typed selector, or `undefined` if
   * the query has no brackets yet
   * @returns At most {@link ColumnQueryUtils._maxSuggestedMatrixColumns} queries
   */
  private static _suggestMatrixColumns(
    column: MatrixColumn,
    partialSelector: string | undefined,
  ): TableColumnQuerySuggestion[] {
    const suggestions: TableColumnQuerySuggestion[] = [];
    const { selectors } = column;
    if (selectors !== undefined) {
      const partial = partialSelector?.toLowerCase();
      for (const selector of selectors) {
        if (suggestions.length >= ColumnQueryUtils._maxSuggestedMatrixColumns) {
          break;
        }
        if (partial === undefined || selector.toLowerCase().includes(partial)) {
          suggestions.push({ query: `${column.path}[${selector}]` });
        }
      }
      return suggestions;
    }
    for (let i = 0; i < column.numColumns; i++) {
      if (suggestions.length >= ColumnQueryUtils._maxSuggestedMatrixColumns) {
        break;
      }
      if (
        partialSelector === undefined ||
        String(i).startsWith(partialSelector)
      ) {
        suggestions.push({ query: `${column.path}[${i}]` });
      }
    }
    return suggestions;
  }
}

import type { ColumnQuerySuggestion } from "../storage/table";

/**
 * Column query suggestion and resolution for tables with a flat list of columns
 *
 * A column query is the column name itself, so every suggestion is terminal.
 */
export class TableColumnUtils {
  /**
   * Matches a column against a query, case-insensitively
   *
   * @param column - The column name
   * @param query - The column query
   * @returns The index at which the query occurs in the column name, or `-1`
   * if the column does not match
   */
  static matchColumnQuery(column: string, query: string): number {
    return column.toLowerCase().indexOf(query.toLowerCase());
  }

  /**
   * Suggests column queries for the current query
   *
   * All columns are suggested. Columns matching the current query
   * case-insensitively on containment are listed first, in table order, with a
   * column equal to the current query first of all. The remaining columns
   * follow in table order.
   *
   * @param columns - The column names of the table
   * @param currentQuery - The partial column name
   * @returns The suggested column queries
   */
  static suggestColumnQueries(
    columns: string[],
    currentQuery: string,
  ): ColumnQuerySuggestion[] {
    const matches: string[] = [];
    const others: string[] = [];
    for (const column of columns) {
      if (column === currentQuery) {
        matches.unshift(column);
      } else if (
        TableColumnUtils.matchColumnQuery(column, currentQuery) !== -1
      ) {
        matches.push(column);
      } else {
        others.push(column);
      }
    }
    return [...matches, ...others].map((query) => ({ query, terminal: true }));
  }

  /**
   * Resolves a column query to a column name
   *
   * The query resolves to the column with the same name, or otherwise to the
   * single column whose name differs only in case.
   *
   * @param columns - The column names of the table
   * @param query - The column query
   * @returns The column name, or `null` if the query matches no column or
   * several columns
   */
  static resolveColumnQuery(columns: string[], query: string): string | null {
    if (columns.includes(query)) {
      return query;
    }
    const lowerCaseQuery = query.toLowerCase();
    const matches = columns.filter(
      (column) => column.toLowerCase() === lowerCaseQuery,
    );
    return matches.length === 1 ? matches[0]! : null;
  }
}

/**
 * Column query suggestion and resolution for tables with a flat list of columns
 *
 * A column query is the column name itself.
 */
export class TableColumnUtils {
  /**
   * Suggests column queries matching the current query
   *
   * Columns are matched case-insensitively on containing the current query. A
   * column equal to the current query is listed first, the remaining matches
   * follow in table order.
   *
   * @param columns - The column names of the table
   * @param currentQuery - The partial column name
   * @returns The suggested column queries
   */
  static suggestColumnQueries(
    columns: string[],
    currentQuery: string,
  ): string[] {
    const lowerCaseQuery = currentQuery.toLowerCase();
    const matches = columns.filter((column) =>
      column.toLowerCase().includes(lowerCaseQuery),
    );
    const exactMatchIndex = matches.indexOf(currentQuery);
    if (exactMatchIndex > 0) {
      matches.unshift(...matches.splice(exactMatchIndex, 1));
    }
    return matches;
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

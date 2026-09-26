import type { Table, TableColumnRef } from "@tissuumaps/core";

/** Separates the optional table name from the column name in a column query */
export const tableSeparator = ":";

/**
 * Finds the table with the given name, if exactly one table has that name
 *
 * @param tables - The tables of the current project
 * @param name - The table name
 * @returns The uniquely named table, or `undefined` if there is none
 */
function findUniquelyNamedTable(
  tables: Table[],
  name: string,
): Table | undefined {
  const namedTables = tables.filter((table) => table.name === name);
  return namedTables.length === 1 ? namedTables[0] : undefined;
}

/**
 * Formats a table column reference as a column query
 *
 * Tables whose name is shared with another table are prefixed by their ID.
 *
 * @param tableColumnRef - The table column reference
 * @param tables - The tables of the current project
 * @returns The column query
 */
export function formatTableColumnQuery(
  tableColumnRef: TableColumnRef,
  tables: Table[],
): string {
  if (tableColumnRef.table === undefined) {
    return tableColumnRef.column;
  }
  const table = tables.find((table) => table.id === tableColumnRef.table);
  const tableQuery =
    table !== undefined && findUniquelyNamedTable(tables, table.name) === table
      ? table.name
      : tableColumnRef.table;
  return `${tableQuery}${tableSeparator}${tableColumnRef.column}`;
}

/**
 * Splits a column query into the table it queries and the column name
 *
 * A column query may name a table other than `tableId` by prefixing the column
 * name with that table's name or ID and {@link tableSeparator}.
 *
 * @param query - The column query
 * @param tableId - The ID of the table queried by unprefixed column queries
 * @param tables - The tables of the current project
 * @returns The queried table, the query's table prefix and the unprefixed
 * column query
 */
export function splitColumnQuery(
  query: string,
  tableId: string | null,
  tables: Table[],
): { table: Table | null; tablePrefix: string; columnQuery: string } {
  const separatorIndex = query.indexOf(tableSeparator);
  if (separatorIndex !== -1) {
    const queryTableName = query.slice(0, separatorIndex);
    const queryTable =
      findUniquelyNamedTable(tables, queryTableName) ??
      tables.find((table) => table.id === queryTableName);
    if (queryTable !== undefined) {
      return {
        table: queryTable,
        tablePrefix: query.slice(0, separatorIndex + tableSeparator.length),
        columnQuery: query.slice(separatorIndex + tableSeparator.length),
      };
    }
  }
  return {
    table: tables.find((table) => table.id === tableId) ?? null,
    tablePrefix: "",
    columnQuery: query,
  };
}

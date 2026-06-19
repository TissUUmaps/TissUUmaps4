import * as papaparse from "papaparse";

import {
  type ProgressCallback,
  type TableDataProvider,
} from "@tissuumaps/core";

import { CSVTableData } from "./CSVTableData";
import {
  type CSVTableDataSource,
  createDefaultCSVTableDataSource,
} from "./CSVTableDataSource";

export class CSVTableDataProvider implements TableDataProvider<
  CSVTableDataSource,
  CSVTableData
> {
  readonly name = "CSV";

  readonly schema = {
    type: "object",
    properties: {
      url: {
        type: "string",
      },
      // TODO path
      // TODO columns
      idColumn: {
        type: "string",
      },
      nameColumn: {
        type: "string",
      },
      // TODO loadColumns
      // TODO parseConfig
    },
    required: ["url"], // TODO ... or path
  };

  readonly uischema = {
    type: "VerticalLayout",
    elements: [
      {
        type: "Control",
        scope: "#/properties/url",
        label: "URL",
      },
      // TODO path
      // TODO columns
      {
        type: "Control",
        scope: "#/properties/idColumn",
        label: "ID Column",
      },
      {
        type: "Control",
        scope: "#/properties/nameColumn",
        label: "Name Column",
      },
      // TODO loadColumns
      // TODO parseConfig
    ],
  };

  async open(
    dataSource: CSVTableDataSource,
    options?: {
      signal?: AbortSignal;
      onProgress?: ProgressCallback;
      workspace?: FileSystemDirectoryHandle | null;
    },
  ): Promise<CSVTableData> {
    const { signal, workspace = null } = options ?? {};
    signal?.throwIfAborted();

    let columns:
      | {
          name: string;
          index: number;
          isNaN: boolean;
          data: (string | number)[];
        }[]
      | undefined;
    const defaultDataSource = createDefaultCSVTableDataSource(dataSource);
    const parseConfig: Partial<
      papaparse.ParseLocalConfig & papaparse.ParseRemoteConfig
    > = {
      ...defaultDataSource.parseConfig,
      worker: true,
      header: false,
      skipEmptyLines: true,
      chunk: (
        results: papaparse.ParseResult<string[]>,
        parser: papaparse.Parser,
      ) => {
        for (const rowData of results.data) {
          if (columns === undefined) {
            const allColumnNames = defaultDataSource.columns ?? rowData;
            const columnNames = defaultDataSource.loadColumns ?? allColumnNames;
            columns = columnNames.map((name) => {
              const index = allColumnNames.indexOf(name);
              if (index === -1) {
                throw new Error(`Column "${name}" not found in CSV file`);
              }
              return { name, index, isNaN: false, data: [] };
            });
            if (allColumnNames === rowData) {
              continue;
            }
          }
          for (const column of columns) {
            const value = rowData[column.index] ?? "";
            if (column.isNaN) {
              column.data.push(value);
            } else {
              let valueIsNaN = value === "";
              if (!valueIsNaN) {
                const numericValue = +value;
                valueIsNaN = isNaN(numericValue);
                if (!valueIsNaN) {
                  column.data.push(numericValue);
                }
              }
              if (valueIsNaN) {
                column.data = Array.from(column.data, String);
                column.data.push(value);
                column.isNaN = true;
              }
            }
          }
        }
        if (signal?.aborted) {
          parser.abort();
        }
      },
    };

    const makeColumnValues = () => {
      const columnValues = new Map<string, string[] | Float32Array>();
      if (columns !== undefined) {
        for (const column of columns) {
          columnValues.set(
            column.name,
            column.isNaN
              ? (column.data as string[])
              : new Float32Array(column.data as number[]),
          );
        }
      }
      return columnValues;
    };

    let columnValues: Map<string, string[] | Float32Array>;
    if (defaultDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(defaultDataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      columnValues = await new Promise((resolve, reject) =>
        papaparse.parse(file, {
          ...parseConfig,
          error: reject,
          complete: () => resolve(makeColumnValues()),
        }),
      );
      signal?.throwIfAborted();
    } else if (defaultDataSource.url !== undefined) {
      const url = defaultDataSource.url;
      columnValues = await new Promise((resolve, reject) =>
        papaparse.parse(url, {
          ...parseConfig,
          download: true,
          error: reject,
          complete: () => resolve(makeColumnValues()),
        }),
      );
      signal?.throwIfAborted();
    } else if (defaultDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }

    if (columns === undefined || columns.length === 0) {
      throw new Error("No columns found in the CSV file.");
    }

    const n = columns[0]!.data.length;

    let ids: number[] | undefined;
    if (defaultDataSource.idColumn !== undefined) {
      const idColumnValues = columnValues.get(defaultDataSource.idColumn);
      if (idColumnValues === undefined) {
        throw new Error(
          `ID column "${defaultDataSource.idColumn}" does not exist in the table.`,
        );
      }
      ids = Array.from<string | number, number>(idColumnValues, (id) => {
        const numericId = +id;
        if (id === "" || !Number.isInteger(numericId)) {
          throw new Error(`ID value "${id}" is not a valid integer.`);
        }
        return numericId;
      });
    }

    let names: string[] | undefined;
    if (defaultDataSource.nameColumn !== undefined) {
      const nameColumnValues = columnValues.get(defaultDataSource.nameColumn);
      if (nameColumnValues === undefined) {
        throw new Error(
          `Name column "${defaultDataSource.nameColumn}" does not exist in the table.`,
        );
      }
      names = Array.from<string | number, string>(nameColumnValues, String);
    }

    return new CSVTableData(
      n,
      ids,
      names,
      columns.map((c) => c.name),
      columnValues,
    );
  }
}

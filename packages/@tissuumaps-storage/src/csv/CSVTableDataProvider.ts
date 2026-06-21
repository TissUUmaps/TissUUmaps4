import * as papaparse from "papaparse";

import {
  type ProgressCallback,
  type TableDataProvider,
  type TypedArray,
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
          chunks: (string[] | TypedArray)[];
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
        let columnChunks: (string[] | TypedArray)[] | undefined;
        let numChunkRows = results.data.length;
        let currentChunkRow = 0;
        for (const rowData of results.data) {
          if (columns === undefined) {
            let columnNames = defaultDataSource.columns;
            if (columnNames === undefined) {
              columnNames = rowData;
              numChunkRows -= 1;
            }
            columns = (defaultDataSource.loadColumns ?? columnNames).map(
              (columnName) => ({
                name: columnName,
                index: columnNames.indexOf(columnName),
                isNaN: false,
                chunks: [],
              }),
            );
            if (columnNames === rowData) {
              continue;
            }
          }
          if (columnChunks === undefined) {
            columnChunks = columns.map((column) =>
              column.isNaN
                ? new Array<string>(numChunkRows)
                : new Float32Array(numChunkRows),
            );
          }
          for (let c = 0; c < columns.length; c++) {
            const column = columns[c]!;
            const columnChunk = columnChunks[c]!;
            if (column.index < 0) {
              parser.abort();
              throw new Error(`Column "${column.name}" not found`);
            }
            if (column.index >= rowData.length) {
              parser.abort();
              throw new Error(`Missing value for column "${column.name}"`);
            }
            const value = rowData[column.index]!;
            if (Array.isArray(columnChunk)) {
              columnChunk[currentChunkRow] = value;
            } else {
              let valueIsNaN = value === "";
              if (!valueIsNaN) {
                const numericValue = +value;
                valueIsNaN = isNaN(numericValue);
                if (!valueIsNaN) {
                  columnChunk[currentChunkRow] = numericValue;
                }
              }
              if (valueIsNaN) {
                column.isNaN = true;
                for (let i = 0; i < column.chunks.length; i++) {
                  column.chunks[i] = Array.from(column.chunks[i]!, String);
                }
                const newColumnChunk = new Array<string>(numChunkRows);
                for (let i = 0; i < currentChunkRow; i++) {
                  newColumnChunk[i] = String(columnChunk[i]!);
                }
                newColumnChunk[currentChunkRow] = value;
                columnChunks[c] = newColumnChunk;
              }
            }
          }
          currentChunkRow++;
        }
        if (columns !== undefined && columnChunks !== undefined) {
          for (let c = 0; c < columns.length; c++) {
            const column = columns[c]!;
            const columnChunk = columnChunks[c]!;
            column.chunks.push(columnChunk);
          }
        }
        if (signal?.aborted) {
          parser.abort();
        }
      },
    };

    const makeColumnValues = () => {
      const columnValues = new Map<string, string[] | TypedArray>();
      if (columns !== undefined) {
        for (const column of columns) {
          let values;
          if (column.isNaN) {
            const chunks = column.chunks as string[][];
            values = chunks.flat();
          } else {
            const chunks = column.chunks as TypedArray[];
            const n = chunks.reduce((n, chunk) => n + chunk.length, 0);
            values = new Float32Array(n);
            let offset = 0;
            for (const chunk of chunks) {
              values.set(chunk, offset);
              offset += chunk.length;
            }
          }
          columnValues.set(column.name, values);
          column.chunks = [];
        }
      }
      return columnValues;
    };

    let columnValues: Map<string, string[] | TypedArray>;
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

    const n = columnValues.get(columns[0]!.name)?.length ?? 0;

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

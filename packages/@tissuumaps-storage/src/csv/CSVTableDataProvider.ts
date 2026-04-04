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
      // TODO loadColumns
      // TODO chunkSize
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
      // TODO loadColumns
      // TODO chunkSize
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

    const defaultDataSource = createDefaultCSVTableDataSource(dataSource);

    let numRows = 0;
    let allColumns = defaultDataSource.columns;
    let filteredColumns = defaultDataSource.loadColumns ?? allColumns;
    let filteredColumnInfos:
      | {
          name: string;
          index: number;
          chunks: (string[] | TypedArray)[];
          currentChunk: (string | number)[];
          isNaN: boolean;
        }[]
      | undefined;
    if (allColumns !== undefined && filteredColumns !== undefined) {
      filteredColumnInfos = filteredColumns.map((column) => ({
        name: column,
        index: allColumns!.indexOf(column),
        chunks: [],
        currentChunk: [],
        isNaN: false,
      }));
    }

    const step = (
      results: papaparse.ParseStepResult<string[]>,
      parser: papaparse.Parser,
    ) => {
      if (
        allColumns === undefined ||
        filteredColumns === undefined ||
        filteredColumnInfos === undefined
      ) {
        allColumns = results.data;
        filteredColumns ??= allColumns;
        filteredColumnInfos = filteredColumns.map((column) => ({
          name: column,
          index: allColumns!.indexOf(column),
          chunks: [],
          currentChunk: [],
          isNaN: false,
        }));
      } else {
        if (results.data.length !== allColumns.length) {
          throw new Error(
            `Data row ${numRows} has ${results.data.length} values, expected ${allColumns.length}.`,
          );
        }
        for (const columnInfo of filteredColumnInfos) {
          const value = results.data[columnInfo.index]!;
          columnInfo.isNaN = columnInfo.isNaN || value === "" || isNaN(+value);
          columnInfo.currentChunk.push(columnInfo.isNaN ? value : +value);
        }
        numRows += 1;
        if (numRows % defaultDataSource.chunkSize === 0) {
          for (const columnInfo of filteredColumnInfos) {
            columnInfo.chunks.push(
              columnInfo.isNaN
                ? (columnInfo.currentChunk as string[])
                : new Float32Array(columnInfo.currentChunk as number[]),
            );
            columnInfo.currentChunk = [];
          }
        }
      }
      if (signal?.aborted) {
        parser.abort();
      }
    };

    const complete = () => {
      const columnValues = new Map<string, string[] | Float32Array>();
      for (const columnInfo of filteredColumnInfos!) {
        if (columnInfo.currentChunk.length > 0) {
          columnInfo.chunks.push(
            columnInfo.isNaN
              ? (columnInfo.currentChunk as string[])
              : new Float32Array(columnInfo.currentChunk as number[]),
          );
          columnInfo.currentChunk = [];
        }
        if (columnInfo.isNaN) {
          const values = columnInfo.chunks.flatMap((chunkValues) =>
            Array.isArray(chunkValues)
              ? chunkValues
              : Array.from(chunkValues, String),
          );
          columnValues.set(columnInfo.name, values);
        } else {
          const values = new Float32Array(numRows);
          let offset = 0;
          for (const chunkValues of columnInfo.chunks) {
            values.set(chunkValues as TypedArray, offset);
            offset += chunkValues.length;
          }
          columnValues.set(columnInfo.name, values);
        }
        columnInfo.chunks = [];
      }
      return columnValues;
    };

    let filteredColumnValues;
    if (defaultDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(defaultDataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      filteredColumnValues = await new Promise<
        Map<string, string[] | Float32Array>
      >((resolve, reject) =>
        papaparse.parse(file, {
          ...defaultDataSource.parseConfig,
          header: false,
          skipEmptyLines: true,
          step: step,
          complete: () => resolve(complete()),
          error: reject,
        }),
      );
      signal?.throwIfAborted();
    } else if (defaultDataSource.url !== undefined) {
      const url = defaultDataSource.url;
      filteredColumnValues = await new Promise<
        Map<string, string[] | Float32Array>
      >((resolve, reject) =>
        papaparse.parse(url, {
          ...defaultDataSource.parseConfig,
          download: true,
          header: false,
          skipEmptyLines: true,
          step: step,
          complete: () => resolve(complete()),
          error: reject,
        }),
      );
      signal?.throwIfAborted();
    } else if (defaultDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }

    let filteredIds;
    if (defaultDataSource.idColumn !== undefined) {
      const idColumnValues = filteredColumnValues.get(
        defaultDataSource.idColumn,
      );
      if (idColumnValues === undefined) {
        throw new Error(
          `ID column "${defaultDataSource.idColumn}" does not exist in the table.`,
        );
      }
      filteredIds = Array.from(
        idColumnValues.map((v) => {
          if (!Number.isInteger(v)) {
            throw new Error(
              `ID column "${defaultDataSource.idColumn}" contains non-integer values.`,
            );
          }
          return +v;
        }),
      );
    }

    return new CSVTableData(
      numRows,
      filteredColumns!,
      filteredColumnValues,
      filteredIds,
    );
  }
}

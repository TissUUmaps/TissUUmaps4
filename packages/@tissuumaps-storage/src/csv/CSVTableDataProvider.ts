import {
  type ParseLocalConfig,
  type ParseRemoteConfig,
  type ParseResult,
  type Parser,
  parse,
} from "papaparse";

import {
  AsyncUtils,
  type DataProviderOpenOptions,
  ParseUtils,
  type TableDataProvider,
  type TypedArray,
} from "@tissuumaps/core";

import { CSVTableData } from "./CSVTableData";
import {
  type CSVTableDataSource,
  type DefaultCSVTableDataSource,
  csvTableDataSourceDefaults,
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

  normalizeDataSource(
    dataSource: CSVTableDataSource,
  ): DefaultCSVTableDataSource {
    let { url } = dataSource;
    if (url !== undefined) {
      url = new URL(url, document.baseURI).href;
    }
    return { ...csvTableDataSourceDefaults, ...dataSource, url };
  }

  async load(
    dataSource: CSVTableDataSource,
    options?: DataProviderOpenOptions,
  ): Promise<CSVTableData> {
    const { signal, onProgress, workspace = null } = options ?? {};
    signal?.throwIfAborted();

    let columnMetas:
      | {
          name: string;
          index: number;
          isNaN: boolean;
          chunks: (string[] | TypedArray)[];
        }[]
      | undefined;
    let byteLength: number | undefined;
    let parseError: unknown;

    const normalizedDataSource = this.normalizeDataSource(dataSource);

    const parseConfig: Partial<ParseLocalConfig & ParseRemoteConfig> = {
      ...normalizedDataSource.parseConfig,
      worker: true,
      header: false,
      skipEmptyLines: true,
      chunk: (results: ParseResult<string[]>, parser: Parser) => {
        if (signal?.aborted) {
          parser.abort();
          return;
        }
        let columnChunks: (string[] | TypedArray)[] | undefined;
        let numChunkRows = results.data.length;
        let currentChunkRow = 0;
        for (const rowData of results.data) {
          if (columnMetas === undefined) {
            let columns = normalizedDataSource.columns;
            if (columns === undefined) {
              columns = rowData;
              numChunkRows -= 1;
            }
            columnMetas = (normalizedDataSource.loadColumns ?? columns).map(
              (column) => ({
                name: column,
                index: columns.indexOf(column),
                isNaN: false,
                chunks: [],
              }),
            );
            if (columns === rowData) {
              continue;
            }
          }
          if (columnChunks === undefined) {
            columnChunks = columnMetas.map((column) =>
              column.isNaN
                ? new Array<string>(numChunkRows)
                : new Float32Array(numChunkRows),
            );
          }
          for (let c = 0; c < columnMetas.length; c++) {
            const columnMeta = columnMetas[c]!;
            const columnChunk = columnChunks[c]!;
            if (columnMeta.index < 0) {
              parseError = new Error(`Column "${columnMeta.name}" not found`);
              parser.abort();
              return;
            }
            if (columnMeta.index >= rowData.length) {
              parseError = new Error(
                `Missing value for column "${columnMeta.name}"`,
              );
              parser.abort();
              return;
            }
            const value = rowData[columnMeta.index]!;
            if (Array.isArray(columnChunk)) {
              columnChunk[currentChunkRow] = value;
            } else {
              const numericValue = ParseUtils.tryParseFinite(value);
              if (numericValue !== undefined) {
                columnChunk[currentChunkRow] = numericValue;
              } else {
                columnMeta.isNaN = true;
                for (let i = 0; i < columnMeta.chunks.length; i++) {
                  columnMeta.chunks[i] = Array.from(
                    columnMeta.chunks[i]!,
                    String,
                  );
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
        if (columnMetas !== undefined && columnChunks !== undefined) {
          for (let c = 0; c < columnMetas.length; c++) {
            const columnMeta = columnMetas[c]!;
            const columnChunk = columnChunks[c]!;
            columnMeta.chunks.push(columnChunk);
          }
        }
        if (onProgress !== undefined && byteLength !== undefined) {
          onProgress(
            results.meta.cursor,
            Math.max(byteLength, results.meta.cursor),
          );
        }
      },
    };

    const completeParse = (
      resolve: (columnValues: Map<string, string[] | TypedArray>) => void,
      reject: (error: unknown) => void,
    ) => {
      if (signal?.aborted) {
        reject(signal.reason);
        return;
      }
      if (parseError !== undefined) {
        reject(parseError);
        return;
      }
      const columnValues = new Map<string, string[] | TypedArray>();
      if (columnMetas !== undefined) {
        for (const columnMeta of columnMetas) {
          let values;
          if (columnMeta.isNaN) {
            const chunks = columnMeta.chunks as string[][];
            values = chunks.flat();
          } else {
            const chunks = columnMeta.chunks as TypedArray[];
            const n = chunks.reduce((n, chunk) => n + chunk.length, 0);
            values = new Float32Array(n);
            let offset = 0;
            for (const chunk of chunks) {
              values.set(chunk, offset);
              offset += chunk.length;
            }
          }
          columnValues.set(columnMeta.name, values);
          columnMeta.chunks = [];
        }
      }
      resolve(columnValues);
    };

    let columnValues: Map<string, string[] | TypedArray>;
    if (normalizedDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(normalizedDataSource.path);
      signal?.throwIfAborted(); // getFileHandle() does not throw on abort
      const file = await fh.getFile();
      signal?.throwIfAborted(); // getFile() does not throw on abort
      byteLength = file.size;
      columnValues = await AsyncUtils.raceSignal(
        new Promise<Map<string, string[] | TypedArray>>((resolve, reject) =>
          parse(file, {
            ...parseConfig,
            error: reject,
            complete: () => completeParse(resolve, reject),
          }),
        ),
        { signal },
      );
    } else if (normalizedDataSource.url !== undefined) {
      const url = normalizedDataSource.url;
      if (onProgress !== undefined) {
        try {
          const headResponse = await fetch(url, { method: "HEAD", signal });
          const contentLength = headResponse.headers.get("Content-Length");
          if (contentLength !== null) {
            byteLength = Number(contentLength);
          }
        } catch (error) {
          if (signal?.aborted) {
            throw error;
          }
        }
      }
      columnValues = await AsyncUtils.raceSignal(
        new Promise<Map<string, string[] | TypedArray>>((resolve, reject) =>
          parse(url, {
            ...parseConfig,
            download: true,
            error: reject,
            complete: () => completeParse(resolve, reject),
          }),
        ),
        { signal },
      );
    } else if (normalizedDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }

    if (columnMetas === undefined || columnMetas.length === 0) {
      throw new Error("No columns found in the CSV file.");
    }

    const n = columnValues.get(columnMetas[0]!.name)?.length ?? 0;

    let ids: number[] | undefined;
    if (normalizedDataSource.idColumn !== undefined) {
      const idColumnValues = columnValues.get(normalizedDataSource.idColumn);
      if (idColumnValues === undefined) {
        throw new Error(
          `ID column "${normalizedDataSource.idColumn}" does not exist in the table.`,
        );
      }
      ids = Array.from<string | number, number>(idColumnValues, (id) =>
        ParseUtils.parseSafeInt(id),
      );
    }

    let names: string[] | undefined;
    if (normalizedDataSource.nameColumn !== undefined) {
      const nameColumnValues = columnValues.get(
        normalizedDataSource.nameColumn,
      );
      if (nameColumnValues === undefined) {
        throw new Error(
          `Name column "${normalizedDataSource.nameColumn}" does not exist in the table.`,
        );
      }
      names = Array.from<string | number, string>(nameColumnValues, String);
    }

    return new CSVTableData(
      n,
      ids,
      names,
      columnMetas.map((columnMeta) => columnMeta.name),
      columnValues,
    );
  }
}

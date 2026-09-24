import {
  type DataProviderLoadOptions,
  NumberUtils,
  SourceUtils,
  type TableDataProvider,
} from "@tissuumaps/core";

import type { HierarchicalTable } from "./HierarchicalTable";
import { HierarchicalTableData } from "./HierarchicalTableData";
import type { HierarchicalTableDataSource } from "./HierarchicalTableDataSource";

/**
 * Base class of table data providers reading hierarchical containers
 *
 * Handles the form, source normalization and the ID and name columns. A
 * container format only has to open a {@link HierarchicalTable} for a
 * normalized source, see
 * {@link HierarchicalTableDataProviderBase.openHierarchicalTable}.
 *
 * @typeParam TDataSource - The data source type of the container format
 */
export abstract class HierarchicalTableDataProviderBase<
  TDataSource extends HierarchicalTableDataSource,
> implements TableDataProvider<TDataSource, HierarchicalTableData> {
  abstract readonly name: string;

  readonly schema = {
    type: "object",
    properties: {
      source: {
        type: "string",
      },
      idColumn: {
        type: "string",
      },
      nameColumn: {
        type: "string",
      },
    },
    required: ["source"],
  };

  readonly uischema = {
    type: "VerticalLayout",
    elements: [
      {
        type: "Control",
        scope: "#/properties/source",
        label: "Source",
      },
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
    ],
  };

  normalize(
    dataSource: TDataSource,
    workspace: FileSystemDirectoryHandle | null,
    projectSource: string | null,
  ): TDataSource {
    return {
      ...dataSource,
      source: SourceUtils.normalizeSource(
        dataSource.source,
        workspace,
        projectSource,
      ),
    };
  }

  async load(
    normalizedDataSource: TDataSource,
    options?: DataProviderLoadOptions,
  ): Promise<HierarchicalTableData> {
    const { signal, workspace = null } = options ?? {};
    signal?.throwIfAborted();

    const table = await this.openHierarchicalTable(
      normalizedDataSource.source,
      {
        signal,
        workspace,
      },
    );
    try {
      const { idColumn, nameColumn } = normalizedDataSource;
      const [idData, nameData] = await Promise.all([
        idColumn !== undefined
          ? table.readColumn(idColumn, { signal })
          : undefined,
        nameColumn !== undefined
          ? table.readColumn(nameColumn, { signal })
          : undefined,
      ]);
      const ids =
        idData !== undefined
          ? Array.from(idData, (id) => NumberUtils.parseSafeInt(id))
          : undefined;
      const names =
        nameData !== undefined ? Array.from(nameData, String) : undefined;
      const numRows = ids?.length ?? names?.length ?? table.numRows;
      if (
        ids !== undefined &&
        names !== undefined &&
        names.length !== numRows
      ) {
        throw new Error(
          `ID column "${idColumn}" and name column "${nameColumn}" have different lengths.`,
        );
      }
      return new HierarchicalTableData(table, numRows, ids, names);
    } catch (error) {
      table.close();
      throw error;
    }
  }

  /**
   * Opens the hierarchical table a normalized source points to
   *
   * @param normalizedSource - The normalized source of the data source
   * @param options - `signal` aborts the load; `workspace` is the directory
   * handle of the open workspace, required for workspace-relative sources
   * @returns The open table; closed by the returned
   * {@link HierarchicalTableData}
   */
  protected abstract openHierarchicalTable(
    normalizedSource: string,
    options: {
      signal?: AbortSignal;
      workspace: FileSystemDirectoryHandle | null;
    },
  ): Promise<HierarchicalTable>;
}

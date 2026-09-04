import {
  AsyncUtils,
  type ItemsDataProviderOpenOptions,
  type PointsDataProvider,
} from "@tissuumaps/core";

import { TablePointsData } from "./TablePointsData";
import {
  type NormalizedTablePointsDataSource,
  type TablePointsDataSource,
  tablePointsDataSourceDefaults,
} from "./TablePointsDataSource";

export class TablePointsDataProvider implements PointsDataProvider<
  TablePointsDataSource,
  TablePointsData,
  NormalizedTablePointsDataSource
> {
  readonly name = "Table";

  readonly schema = {
    type: "object",
    properties: {
      table: {
        type: "string",
      },
      x: {
        type: "string",
        default: tablePointsDataSourceDefaults.x,
      },
      y: {
        type: "string",
        default: tablePointsDataSourceDefaults.y,
      },
    },
    required: ["table"],
  };

  readonly uischema = {
    type: "VerticalLayout",
    elements: [
      {
        type: "Control",
        scope: "#/properties/table",
        label: "Table",
      },
      {
        type: "Control",
        scope: "#/properties/x",
        label: "X column",
      },
      {
        type: "Control",
        scope: "#/properties/y",
        label: "Y column",
      },
    ],
  };

  normalize(
    dataSource: TablePointsDataSource,
  ): NormalizedTablePointsDataSource {
    return { ...tablePointsDataSourceDefaults, ...dataSource };
  }

  async load(
    normalizedDataSource: NormalizedTablePointsDataSource,
    options?: ItemsDataProviderOpenOptions,
  ): Promise<TablePointsData> {
    const { signal, tableDataPromise } = options ?? {};
    signal?.throwIfAborted();
    if (tableDataPromise === undefined) {
      throw new Error("Table data must be provided");
    }
    const tableData = await AsyncUtils.raceSignal(tableDataPromise, { signal });
    return new TablePointsData(
      tableData,
      normalizedDataSource.x,
      normalizedDataSource.y,
    );
  }
}

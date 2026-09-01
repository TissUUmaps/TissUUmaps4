import {
  AsyncUtils,
  type ItemsDataProviderOpenOptions,
  type PointsDataProvider,
} from "@tissuumaps/core";

import { TablePointsData } from "./TablePointsData";
import {
  type DefaultTablePointsDataSource,
  type TablePointsDataSource,
  tablePointsDataSourceDefaults,
} from "./TablePointsDataSource";

export class TablePointsDataProvider implements PointsDataProvider<
  TablePointsDataSource,
  TablePointsData
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

  normalizeDataSource(
    dataSource: TablePointsDataSource,
  ): DefaultTablePointsDataSource {
    return { ...tablePointsDataSourceDefaults, ...dataSource };
  }

  async load(
    dataSource: TablePointsDataSource,
    options?: ItemsDataProviderOpenOptions,
  ): Promise<TablePointsData> {
    const { signal, tableDataPromise } = options ?? {};
    signal?.throwIfAborted();
    if (tableDataPromise === undefined) {
      throw new Error("Table data must be provided");
    }
    const normalizedDataSource = this.normalizeDataSource(dataSource);
    const tableData = await AsyncUtils.raceSignal(tableDataPromise, { signal });
    return new TablePointsData(
      tableData,
      normalizedDataSource.x,
      normalizedDataSource.y,
    );
  }
}

import { type JsonSchema, type UISchemaElement } from "@jsonforms/core";

import {
  type PointsDataSource,
  type RawPointsDataSource,
  createPointsDataSource,
} from "@tissuumaps/core";

export const tablePointsDataSourceType = "table";
export const tablePointsDataSourceDefaults = {};
export const tablePointsDataSourceSchema: JsonSchema = {
  type: "object",
  properties: {
    tableId: {
      type: "string",
    },
    // TODO JSON schema for dimensionColumns
  },
  required: ["tableId"],
};
export const tablePointsDataSourceUISchema: UISchemaElement = {
  type: "VerticalLayout",
  elements: [
    {
      type: "Control",
      scope: "#/properties/tableId",
      label: "Table",
      options: { "x-renderer": "TableSelect" },
    },
    // TODO UI schema for dimensionColumns
  ],
};

export interface RawTablePointsDataSource extends RawPointsDataSource<
  typeof tablePointsDataSourceType
> {
  url: undefined; // Table data does not use a URL
  path: undefined; // Table data does not use a path
  tableId: string;
  dimensionColumns?: string[];
}

export type TablePointsDataSource = PointsDataSource<
  typeof tablePointsDataSourceType
> &
  Required<
    Pick<RawTablePointsDataSource, keyof typeof tablePointsDataSourceDefaults>
  > &
  Omit<
    RawTablePointsDataSource,
    | keyof PointsDataSource<typeof tablePointsDataSourceType>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof tablePointsDataSourceDefaults
  >;

export function createTablePointsDataSource(
  rawTablePointsDataSource: RawTablePointsDataSource,
): TablePointsDataSource {
  return {
    ...createPointsDataSource(rawTablePointsDataSource),
    ...tablePointsDataSourceDefaults,
    ...rawTablePointsDataSource,
  };
}

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
    table: {
      type: "string",
    },
  },
  required: ["table"],
};
export const tablePointsDataSourceUISchema: UISchemaElement = {
  type: "VerticalLayout",
  elements: [
    {
      type: "Control",
      scope: "#/properties/table",
      label: "Table",
    },
  ],
};

export interface RawTablePointsDataSource extends RawPointsDataSource<
  typeof tablePointsDataSourceType
> {
  url: undefined; // Table data does not use a URL
  path: undefined; // Table data does not use a path
  table: string;
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

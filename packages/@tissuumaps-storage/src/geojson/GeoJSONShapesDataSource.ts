import {
  type RawShapesDataSource,
  type ShapesDataSource,
  createShapesDataSource,
} from "@tissuumaps/core";

export const geoJSONShapesDataSourceType = "geojson";
export const geoJSONShapesDataSourceDefaults = {};
export const geoJSONShapesDataSourceSchema = {
  type: "object",
  properties: {
    url: {
      type: "string",
    },
    // TODO path
    idProperty: {
      type: "string",
    },
  },
};
export const geoJSONShapesDataSourceUISchema = {
  type: "VerticalLayout",
  elements: [
    {
      type: "Control",
      scope: "#/properties/url",
      label: "URL",
    },
    // TODO path
    {
      type: "Control",
      scope: "#/properties/idProperty",
      label: "ID Property",
    },
  ],
  required: ["url"], // TODO ... or path
};

export interface RawGeoJSONShapesDataSource extends RawShapesDataSource<
  typeof geoJSONShapesDataSourceType
> {
  idProperty?: string;
}

export type GeoJSONShapesDataSource = ShapesDataSource<
  typeof geoJSONShapesDataSourceType
> &
  Required<
    Pick<
      RawGeoJSONShapesDataSource,
      keyof typeof geoJSONShapesDataSourceDefaults
    >
  > &
  Omit<
    RawGeoJSONShapesDataSource,
    | keyof ShapesDataSource<typeof geoJSONShapesDataSourceType>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof geoJSONShapesDataSourceDefaults
  >;

export function createGeoJSONShapesDataSource(
  rawGeoJSONShapesDataSource: RawGeoJSONShapesDataSource,
): GeoJSONShapesDataSource {
  return {
    ...createShapesDataSource(rawGeoJSONShapesDataSource),
    ...geoJSONShapesDataSourceDefaults,
    ...rawGeoJSONShapesDataSource,
  };
}

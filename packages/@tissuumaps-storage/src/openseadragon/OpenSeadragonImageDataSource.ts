import {
  type ImageDataSource,
  type RawImageDataSource,
  type TileSourceConfig,
  createImageDataSource,
} from "@tissuumaps/core";

export const openSeadragonImageDataSourceType = "openseadragon";
export const openSeadragonImageDataSourceDefaults = {};
export const openSeadragonImageDataSourceSchema = {
  type: "object",
  properties: {
    url: {
      type: "string",
    },
    // TODO path
    // TODO tileSourceConfig
  },
};
export const openSeadragonImageDataSourceUISchema = {
  type: "VerticalLayout",
  elements: [
    {
      type: "Control",
      scope: "#/properties/url",
      label: "URL",
    },
    // TODO path
    // TODO tileSourceConfig
  ],
  required: ["url"], // TODO ... or path/tileSourceConfig
};

export interface RawOpenSeadragonImageDataSource extends RawImageDataSource<
  typeof openSeadragonImageDataSourceType
> {
  tileSourceConfig?: TileSourceConfig;
}

export type OpenSeadragonImageDataSource = ImageDataSource<
  typeof openSeadragonImageDataSourceType
> &
  Required<
    Pick<
      RawOpenSeadragonImageDataSource,
      keyof typeof openSeadragonImageDataSourceDefaults
    >
  > &
  Omit<
    RawOpenSeadragonImageDataSource,
    | keyof ImageDataSource<typeof openSeadragonImageDataSourceType>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof openSeadragonImageDataSourceDefaults
  >;

export function createOpenSeadragonImageDataSource(
  rawOpenSeadragonImageDataSource: RawOpenSeadragonImageDataSource,
): OpenSeadragonImageDataSource {
  return {
    ...createImageDataSource(rawOpenSeadragonImageDataSource),
    ...openSeadragonImageDataSourceDefaults,
    ...rawOpenSeadragonImageDataSource,
  };
}

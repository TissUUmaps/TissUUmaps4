import { OMEZarrTileSource } from "omezarr-tilesource";

import type {
  DataProviderOpenOptions,
  ImageDataProvider,
} from "@tissuumaps/core";

import { OMEZarrImageData } from "./OMEZarrImageData";
import {
  type DefaultOMEZarrImageDataSource,
  type OMEZarrImageDataSource,
  omeZarrImageDataSourceDefaults,
} from "./OMEZarrImageDataSource";

export class OMEZarrImageDataProvider implements ImageDataProvider<
  OMEZarrImageDataSource,
  OMEZarrImageData
> {
  readonly name = "OME-Zarr";

  readonly schema = {
    type: "object",
    properties: {
      url: {
        type: "string",
      },
      // TODO path
      sizeC: {
        type: "integer",
      },
      z: {
        type: "integer",
      },
      t: {
        type: "integer",
      },
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
      {
        type: "Control",
        scope: "#/properties/sizeC",
        label: "Number of channels",
      },
      {
        type: "Control",
        scope: "#/properties/z",
        label: "Z-slice",
      },
      {
        type: "Control",
        scope: "#/properties/t",
        label: "Timepoint",
      },
    ],
  };

  normalizeDataSource(
    dataSource: OMEZarrImageDataSource,
  ): DefaultOMEZarrImageDataSource {
    let { url } = dataSource;
    if (url !== undefined) {
      url = new URL(url, document.baseURI).href;
    }
    return { ...omeZarrImageDataSourceDefaults, ...dataSource, url };
  }

  async load(
    dataSource: OMEZarrImageDataSource,
    options?: DataProviderOpenOptions,
  ): Promise<OMEZarrImageData> {
    const { signal, workspace = null } = options ?? {};
    signal?.throwIfAborted();

    const normalizedDataSource = this.normalizeDataSource(dataSource);

    let url: string;
    let objectUrl: string | undefined = undefined;
    if (normalizedDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(normalizedDataSource.path);
      signal?.throwIfAborted(); // getFileHandle() does not throw on abort
      const file = await fh.getFile();
      signal?.throwIfAborted(); // getFile() does not throw on abort
      objectUrl = URL.createObjectURL(file);
      url = objectUrl;
    } else if (normalizedDataSource.url !== undefined) {
      url = normalizedDataSource.url;
    } else if (normalizedDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }
    let tileSource: OMEZarrTileSource | undefined;
    let tileSources: OMEZarrTileSource[] | undefined;
    const { sizeC, z, t } = normalizedDataSource;
    if (sizeC === undefined) {
      tileSource = new OMEZarrTileSource({ url, z, t });
    } else {
      tileSources = [];
      for (let c = 0; c < sizeC; c++) {
        tileSources.push(new OMEZarrTileSource({ url, c, z, t }));
      }
    }
    return new OMEZarrImageData(tileSource, tileSources, objectUrl);
  }
}

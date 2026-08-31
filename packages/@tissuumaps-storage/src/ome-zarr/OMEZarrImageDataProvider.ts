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
      c: {
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
        scope: "#/properties/c",
        label: "Channel",
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

    if (normalizedDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(normalizedDataSource.path);
      signal?.throwIfAborted(); // getFileHandle() does not throw on abort
      const file = await fh.getFile();
      signal?.throwIfAborted(); // getFile() does not throw on abort
      const objectUrl = URL.createObjectURL(file);
      const tileSource = new OMEZarrTileSource({
        url: objectUrl,
        c: normalizedDataSource.c,
        z: normalizedDataSource.z,
        t: normalizedDataSource.t,
      });
      return new OMEZarrImageData(tileSource, objectUrl);
    }

    if (normalizedDataSource.url !== undefined) {
      const tileSource = new OMEZarrTileSource({
        url: normalizedDataSource.url,
        c: normalizedDataSource.c,
        z: normalizedDataSource.z,
        t: normalizedDataSource.t,
      });
      return new OMEZarrImageData(tileSource, undefined);
    }

    if (normalizedDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }

    throw new Error("A URL or workspace path is required to load data.");
  }
}

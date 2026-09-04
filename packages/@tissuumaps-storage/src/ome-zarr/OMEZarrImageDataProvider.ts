import { OMEZarrTileSource } from "omezarr-tilesource";

import type {
  DataProviderOpenOptions,
  ImageDataProvider,
} from "@tissuumaps/core";

import { OMEZarrImageData } from "./OMEZarrImageData";
import {
  type NormalizedOMEZarrImageDataSource,
  type OMEZarrImageDataSource,
  omeZarrImageDataSourceDefaults,
} from "./OMEZarrImageDataSource";

export class OMEZarrImageDataProvider implements ImageDataProvider<
  OMEZarrImageDataSource,
  OMEZarrImageData,
  NormalizedOMEZarrImageDataSource
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

  normalize(
    dataSource: OMEZarrImageDataSource,
    projectUrl: string | null,
  ): NormalizedOMEZarrImageDataSource {
    let { url } = dataSource;
    if (url !== undefined) {
      url = new URL(url, projectUrl ?? document.baseURI).href;
    }
    return { ...omeZarrImageDataSourceDefaults, ...dataSource, url };
  }

  async load(
    normalizedDataSource: NormalizedOMEZarrImageDataSource,
    options?: DataProviderOpenOptions,
  ): Promise<OMEZarrImageData> {
    const { signal, workspace = null } = options ?? {};
    signal?.throwIfAborted();

    // validate before any file handling, so that no object URL is leaked
    if (
      normalizedDataSource.sizeC !== undefined &&
      normalizedDataSource.sizeC <= 0
    ) {
      throw new Error("Number of channels must be a positive integer.");
    }

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
    if (normalizedDataSource.sizeC === undefined) {
      tileSource = new OMEZarrTileSource({
        url,
        z: normalizedDataSource.z,
        t: normalizedDataSource.t,
      });
    } else {
      tileSources = [];
      for (let c = 0; c < normalizedDataSource.sizeC; c++) {
        tileSources.push(
          new OMEZarrTileSource({
            url,
            c,
            z: normalizedDataSource.z,
            t: normalizedDataSource.t,
          }),
        );
      }
    }
    return new OMEZarrImageData(tileSource, tileSources, objectUrl);
  }
}

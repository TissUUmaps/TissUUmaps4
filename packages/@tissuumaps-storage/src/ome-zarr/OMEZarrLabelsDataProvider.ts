import ZipFileStore from "@zarrita/storage/zip";
import { NgffImage } from "ome-zarr.js";
import { OMEZarrTileSource } from "omezarr-tilesource";

import type {
  DataProviderLoadOptions,
  LabelsDataProvider,
} from "@tissuumaps/core";

import { OMEZarrLabelsData } from "./OMEZarrLabelsData";
import {
  type NormalizedOMEZarrLabelsDataSource,
  type OMEZarrLabelsDataSource,
  omeZarrLabelsDataSourceDefaults,
} from "./OMEZarrLabelsDataSource";

export class OMEZarrLabelsDataProvider implements LabelsDataProvider<
  OMEZarrLabelsDataSource,
  OMEZarrLabelsData,
  NormalizedOMEZarrLabelsDataSource
> {
  readonly name = "OME-Zarr";

  readonly schema = {
    type: "object",
    properties: {
      url: {
        type: "string",
      },
      // TODO path
      z: {
        type: "integer",
      },
      t: {
        type: "integer",
      },
      table: {
        type: "string",
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
        scope: "#/properties/z",
        label: "Z-slice",
      },
      {
        type: "Control",
        scope: "#/properties/t",
        label: "Timepoint",
      },
      {
        type: "Control",
        scope: "#/properties/table",
        label: "Table",
      },
    ],
  };

  normalize(
    dataSource: OMEZarrLabelsDataSource,
    projectUrl: string | null,
  ): NormalizedOMEZarrLabelsDataSource {
    let { url } = dataSource;
    if (url !== undefined) {
      url = new URL(url, projectUrl ?? document.baseURI).href;
    }
    return { ...omeZarrLabelsDataSourceDefaults, ...dataSource, url };
  }

  async load(
    normalizedDataSource: NormalizedOMEZarrLabelsDataSource,
    options?: DataProviderLoadOptions,
  ): Promise<OMEZarrLabelsData> {
    const { signal, workspace = null } = options ?? {};
    signal?.throwIfAborted();
    let url: string;
    let store: Parameters<typeof NgffImage.load>[0];
    let objectUrl: string | undefined = undefined;
    if (normalizedDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(normalizedDataSource.path);
      signal?.throwIfAborted(); // getFileHandle() does not throw on abort
      const file = await fh.getFile();
      signal?.throwIfAborted(); // getFile() does not throw on abort
      // a workspace path refers to a single file, i.e. a zipped OME-Zarr
      store = ZipFileStore.fromBlob(file);
      // the tile source loads nothing from the URL (the image is shared), but
      // needs an absolute URL that is unique to the file for its tile cache keys
      objectUrl = URL.createObjectURL(file);
      url = objectUrl;
    } else if (normalizedDataSource.url !== undefined) {
      url = normalizedDataSource.url;
      store = new URL(url).pathname.endsWith(".ozx")
        ? ZipFileStore.fromUrl(url)
        : url;
    } else if (normalizedDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }
    try {
      const image = await NgffImage.load(store, { signal });
      const { z, t } = normalizedDataSource;
      const tileSource = await OMEZarrTileSource.open(
        { url, z, t, dataType: "ome-zarr" },
        image,
      );
      signal?.throwIfAborted(); // OMEZarrTileSource.open() does not throw on abort
      return new OMEZarrLabelsData(tileSource, objectUrl);
    } catch (error) {
      if (objectUrl !== undefined) {
        URL.revokeObjectURL(objectUrl);
      }
      throw error;
    }
  }
}

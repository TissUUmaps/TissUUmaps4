import ZipFileStore from "@zarrita/storage/zip";
import { NgffImage } from "ome-zarr.js";
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
      // the tile sources load nothing from the URL (the image is shared), but
      // need an absolute URL that is unique to the file for their tile cache keys
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
      const arrays = await Promise.all(
        image.paths.map((path) => image.openArray(path, { signal })),
      ); // pre-open all resolution levels once to avoid concurrent reopening
      const cIndex = image.getAxesNames().indexOf("c");
      const sizeC = cIndex >= 0 ? arrays[0]!.shape[cIndex]! : 1;
      const { z, t } = normalizedDataSource;
      let tileSource: OMEZarrTileSource | undefined;
      let tileSources: OMEZarrTileSource[] | undefined;
      if (sizeC > 1) {
        const tileSourcePromises: Promise<OMEZarrTileSource>[] = [];
        for (let c = 0; c < sizeC; c++) {
          const tileSourcePromise = OMEZarrTileSource.open(
            { url, c, z, t, dataType: "ome-zarr" },
            image,
          );
          tileSourcePromises.push(tileSourcePromise);
        }
        tileSources = await Promise.all(tileSourcePromises);
        signal?.throwIfAborted(); // OMEZarrTileSource.open() does not throw on abort
      } else {
        tileSource = await OMEZarrTileSource.open(
          { url, z, t, dataType: "ome-zarr" },
          image,
        );
        signal?.throwIfAborted(); // OMEZarrTileSource.open() does not throw on abort
      }
      return new OMEZarrImageData(image, tileSource, tileSources, objectUrl);
    } catch (error) {
      if (objectUrl !== undefined) {
        URL.revokeObjectURL(objectUrl);
      }
      throw error;
    }
  }
}

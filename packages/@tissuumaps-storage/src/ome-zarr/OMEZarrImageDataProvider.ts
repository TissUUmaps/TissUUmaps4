import { NgffImage } from "ome-zarr.js";
import { OMEZarrTileSource } from "omezarr-tilesource";

import type { ImageDataProvider } from "@tissuumaps/core";

import { OMEZarrDataProvider } from "./OMEZarrDataProvider";
import { OMEZarrImageData } from "./OMEZarrImageData";
import {
  type NormalizedOMEZarrImageDataSource,
  type OMEZarrImageDataSource,
  omeZarrImageDataSourceDefaults,
} from "./OMEZarrImageDataSource";

export class OMEZarrImageDataProvider
  extends OMEZarrDataProvider<
    OMEZarrImageDataSource,
    OMEZarrImageData,
    NormalizedOMEZarrImageDataSource
  >
  implements
    ImageDataProvider<
      OMEZarrImageDataSource,
      OMEZarrImageData,
      NormalizedOMEZarrImageDataSource
    >
{
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

  protected async open(
    url: string,
    store: Parameters<typeof NgffImage.load>[0],
    normalizedDataSource: NormalizedOMEZarrImageDataSource,
    objectUrl: string | undefined,
    signal: AbortSignal | undefined,
  ): Promise<OMEZarrImageData> {
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
  }
}

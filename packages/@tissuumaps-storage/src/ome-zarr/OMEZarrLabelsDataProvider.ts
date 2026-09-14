import { NgffImage } from "ome-zarr.js";
import { OMEZarrTileSource } from "omezarr-tilesource";

import type { LabelsDataProvider } from "@tissuumaps/core";

import { OMEZarrDataProvider } from "./OMEZarrDataProvider";
import { OMEZarrLabelsData } from "./OMEZarrLabelsData";
import {
  type NormalizedOMEZarrLabelsDataSource,
  type OMEZarrLabelsDataSource,
  omeZarrLabelsDataSourceDefaults,
} from "./OMEZarrLabelsDataSource";

export class OMEZarrLabelsDataProvider
  extends OMEZarrDataProvider<
    OMEZarrLabelsDataSource,
    OMEZarrLabelsData,
    NormalizedOMEZarrLabelsDataSource
  >
  implements
    LabelsDataProvider<
      OMEZarrLabelsDataSource,
      OMEZarrLabelsData,
      NormalizedOMEZarrLabelsDataSource
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

  protected async open(
    url: string,
    store: Parameters<typeof NgffImage.load>[0],
    normalizedDataSource: NormalizedOMEZarrLabelsDataSource,
    objectUrl: string | undefined,
    signal: AbortSignal | undefined,
  ): Promise<OMEZarrLabelsData> {
    const image = await NgffImage.load(store, { signal });
    const { z, t } = normalizedDataSource;
    const tileSource = await OMEZarrTileSource.open(
      { url, z, t, dataType: "ome-zarr" },
      image,
    );
    signal?.throwIfAborted(); // OMEZarrTileSource.open() does not throw on abort
    return new OMEZarrLabelsData(tileSource, objectUrl);
  }
}

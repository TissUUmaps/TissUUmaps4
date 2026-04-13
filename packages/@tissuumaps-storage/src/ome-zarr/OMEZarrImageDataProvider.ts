import { OMEZarrTileSource } from "omezarr-tilesource";

import {
  type ImageDataProvider,
  type ProgressCallback,
} from "@tissuumaps/core";

import { OMEZarrImageData } from "./OMEZarrImageData";
import {
  type OMEZarrImageDataSource,
  createDefaultOMEZarrImageDataSource,
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
        type: "number",
      },
      z: {
        type: "number",
      },
      t: {
        type: "number",
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

  async open(
    dataSource: OMEZarrImageDataSource,
    options?: {
      signal?: AbortSignal;
      onProgress?: ProgressCallback;
      workspace?: FileSystemDirectoryHandle | null;
    },
  ): Promise<OMEZarrImageData> {
    const { signal, workspace = null } = options ?? {};
    signal?.throwIfAborted();

    const defaultDataSource = createDefaultOMEZarrImageDataSource(dataSource);

    if (defaultDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(defaultDataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const objectUrl = URL.createObjectURL(file);
      const tileSource = new OMEZarrTileSource({
        url: objectUrl,
        c: defaultDataSource.c,
        z: defaultDataSource.z,
        t: defaultDataSource.t,
      });
      return new OMEZarrImageData(tileSource, objectUrl);
    }

    if (defaultDataSource.url !== undefined) {
      const tileSource = new OMEZarrTileSource({
        url: defaultDataSource.url,
        c: defaultDataSource.c,
        z: defaultDataSource.z,
        t: defaultDataSource.t,
      });
      return new OMEZarrImageData(tileSource, undefined);
    }

    if (defaultDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }

    throw new Error("A URL or workspace path is required to load data.");
  }
}

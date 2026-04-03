import {
  type ImageDataProvider,
  type ProgressCallback,
} from "@tissuumaps/core";

import { OpenSeadragonImageData } from "./OpenSeadragonImageData";
import {
  type OpenSeadragonImageDataSource,
  createDefaultOpenSeadragonImageDataSource,
} from "./OpenSeadragonImageDataSource";

export class OpenSeadragonImageDataProvider implements ImageDataProvider<
  OpenSeadragonImageDataSource,
  OpenSeadragonImageData
> {
  readonly name = "OpenSeadragon";

  readonly schema = {
    type: "object",
    properties: {
      url: {
        type: "string",
      },
      // TODO path
      // TODO tileSourceConfig
    },
  };

  readonly uiSchema = {
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

  async open(
    dataSource: OpenSeadragonImageDataSource,
    options?: {
      signal?: AbortSignal;
      onProgress?: ProgressCallback;
      workspace?: FileSystemDirectoryHandle | null;
    },
  ): Promise<OpenSeadragonImageData> {
    const { signal, workspace = null } = options ?? {};
    signal?.throwIfAborted();

    const defaultDataSource =
      createDefaultOpenSeadragonImageDataSource(dataSource);

    if (defaultDataSource.tileSourceConfig !== undefined) {
      if (
        defaultDataSource.url !== undefined ||
        defaultDataSource.path !== undefined
      ) {
        throw new Error(
          "Specify either a tile source configuration or a URL/workspace path, not both.",
        );
      }
      return new OpenSeadragonImageData(defaultDataSource.tileSourceConfig);
    }

    if (defaultDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(defaultDataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const objectUrl = URL.createObjectURL(file);
      return new OpenSeadragonImageData(objectUrl, objectUrl);
    }

    if (defaultDataSource.url !== undefined) {
      return new OpenSeadragonImageData(defaultDataSource.url);
    }

    if (defaultDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }

    throw new Error(
      "A tile source configuration or a URL/workspace path is required to load data.",
    );
  }
}

import type {
  DataProviderOpenOptions,
  ImageDataProvider,
} from "@tissuumaps/core";

import { OpenSeadragonImageData } from "./OpenSeadragonImageData";
import {
  type DefaultOpenSeadragonImageDataSource,
  type OpenSeadragonImageDataSource,
  openSeadragonImageDataSourceDefaults,
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
    required: ["url"], // TODO ... or path/tileSourceConfig
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
      // TODO tileSourceConfig
    ],
  };

  normalizeDataSource(
    dataSource: OpenSeadragonImageDataSource,
  ): DefaultOpenSeadragonImageDataSource {
    let { url } = dataSource;
    if (url !== undefined) {
      url = new URL(url, document.baseURI).href;
    }
    return {
      ...openSeadragonImageDataSourceDefaults,
      ...dataSource,
      url,
    };
  }

  async load(
    dataSource: OpenSeadragonImageDataSource,
    options?: DataProviderOpenOptions,
  ): Promise<OpenSeadragonImageData> {
    const { signal, workspace = null } = options ?? {};
    signal?.throwIfAborted();

    const normalizedDataSource = this.normalizeDataSource(dataSource);

    if (normalizedDataSource.tileSourceConfig !== undefined) {
      if (
        normalizedDataSource.url !== undefined ||
        normalizedDataSource.path !== undefined
      ) {
        throw new Error(
          "Specify either a tile source configuration or a URL/workspace path, not both.",
        );
      }
      return new OpenSeadragonImageData(normalizedDataSource.tileSourceConfig);
    }

    if (normalizedDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(normalizedDataSource.path);
      signal?.throwIfAborted(); // getFileHandle() does not throw on abort
      const file = await fh.getFile();
      signal?.throwIfAborted(); // getFile() does not throw on abort
      const objectUrl = URL.createObjectURL(file);
      return new OpenSeadragonImageData(objectUrl, objectUrl);
    }

    if (normalizedDataSource.url !== undefined) {
      return new OpenSeadragonImageData(normalizedDataSource.url);
    }

    if (normalizedDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }

    throw new Error(
      "A tile source configuration or a URL/workspace path is required to load data.",
    );
  }
}

import { AbstractImageDataLoader } from "../base";
import { OpenSeadragonImageData } from "./OpenSeadragonImageData";
import { type OpenSeadragonImageDataSource } from "./OpenSeadragonImageDataSource";

export class OpenSeadragonImageDataLoader extends AbstractImageDataLoader<
  OpenSeadragonImageDataSource,
  OpenSeadragonImageData
> {
  async loadImage({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<OpenSeadragonImageData> {
    signal?.throwIfAborted();
    if (this.dataSource.tileSourceConfig !== undefined) {
      if (
        this.dataSource.url !== undefined ||
        this.dataSource.path !== undefined
      ) {
        throw new Error(
          "Specify either a tile source configuration or a URL/workspace path, not both.",
        );
      }
      return new OpenSeadragonImageData(this.dataSource.tileSourceConfig);
    }
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const objectUrl = URL.createObjectURL(file);
      return new OpenSeadragonImageData(objectUrl, objectUrl);
    }
    if (this.dataSource.url !== undefined) {
      return new OpenSeadragonImageData(this.dataSource.url);
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error(
      "A tile source configuration or a URL/workspace path is required to load data.",
    );
  }
}

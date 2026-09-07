import type {
  CustomTileSource,
  LabelsData,
  TileSourceConfig,
  UintArray,
} from "@tissuumaps/core";

import { DataWrapperBase } from "./DataWrapperBase";

/**
 * Cache wrapper around labels data, delegating to the wrapped data
 */
export class LabelsDataWrapper
  extends DataWrapperBase<LabelsData>
  implements LabelsData
{
  getIds(): number[] {
    return this.data.getIds();
  }

  getSize(): number {
    return this.data.getSize();
  }

  getNames(): string[] | undefined {
    return this.data.getNames();
  }

  getTileSource(): string | TileSourceConfig | CustomTileSource {
    // caching is handled by renderers
    return this.data.getTileSource();
  }

  getData(
    event: Parameters<LabelsData["getData"]>[0],
  ): Promise<number[] | UintArray> {
    return this.data.getData(event);
  }
}

import type {
  CustomTileSource,
  ImageData,
  TileSourceConfig,
} from "@tissuumaps/core";

import { DataWrapperBase } from "./DataWrapperBase";

/**
 * Cache wrapper around image data, delegating to the wrapped data
 *
 * The optional channel getters are only provided if the wrapped data provides
 * them, so that consumers can check for their presence as they would on the
 * wrapped data itself.
 */
export class ImageDataWrapper
  extends DataWrapperBase<ImageData>
  implements ImageData
{
  readonly getChannelData?: ImageData["getChannelData"];
  readonly getChannelName?: ImageData["getChannelName"];
  readonly getChannelVisibility?: ImageData["getChannelVisibility"];
  readonly getChannelOpacity?: ImageData["getChannelOpacity"];
  readonly getChannelColor?: ImageData["getChannelColor"];
  readonly getChannelContrastLimits?: ImageData["getChannelContrastLimits"];

  constructor(data: ImageData) {
    super(data);
    if (data.getChannelData !== undefined) {
      this.getChannelData = (c, event) => this.data.getChannelData!(c, event);
    }
    if (data.getChannelName !== undefined) {
      this.getChannelName = (c) => this.data.getChannelName!(c);
    }
    if (data.getChannelVisibility !== undefined) {
      this.getChannelVisibility = (c) => this.data.getChannelVisibility!(c);
    }
    if (data.getChannelOpacity !== undefined) {
      this.getChannelOpacity = (c) => this.data.getChannelOpacity!(c);
    }
    if (data.getChannelColor !== undefined) {
      this.getChannelColor = (c) => this.data.getChannelColor!(c);
    }
    if (data.getChannelContrastLimits !== undefined) {
      this.getChannelContrastLimits = (c) =>
        this.data.getChannelContrastLimits!(c);
    }
  }

  getSizeC(): number | undefined {
    return this.data.getSizeC();
  }

  getTileSource(c?: number): string | TileSourceConfig | CustomTileSource {
    // caching is handled by renderers
    return this.data.getTileSource(c);
  }
}

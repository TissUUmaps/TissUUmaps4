import type { Dims, TileSourceConfig } from "@tissuumaps/core";

/**
 * Helpers for constructing OpenSeadragon tile sources
 */
export class OpenSeadragonUtils {
  /** A single fully transparent pixel, as a PNG data URL */
  static readonly transparentPixelUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEElEQVR4AQEFAPr/AAAAAAAABQABZHiVOAAAAABJRU5ErkJggg==";

  /** A single opaque black pixel, as a PNG data URL */
  static readonly blackPixelUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNgYGD4DwABBAEAcCBlCwAAAABJRU5ErkJggg==";

  /**
   * Creates a tile source that fills the given size with a single tile
   *
   * The tile source has a single level holding a single tile, which OpenSeadragon
   * scales to the declared size, so a single-pixel URL fills an area of arbitrary
   * size. The declared size is the content size of the resulting tiled image, and
   * therefore determines its aspect ratio in the world.
   *
   * @param size - The size of the tile source, in pixels
   * @param pixelUrl - URL of the image to fill the tile source with
   * @returns The tile source configuration
   */
  static createPixelTileSource(size: Dims, pixelUrl: string): TileSourceConfig {
    return {
      width: size.width,
      height: size.height,
      tileSize: Math.max(size.width, size.height),
      minLevel: 0,
      maxLevel: 0,
      getTileUrl: () => pixelUrl,
    };
  }
}

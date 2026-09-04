import { mat3 } from "gl-matrix";
import OpenSeadragon from "openseadragon";

import {
  type Dims,
  type SimilarityTransform,
  type TileSourceConfig,
  TransformUtils,
} from "@tissuumaps/core";

/**
 * Helpers for constructing OpenSeadragon tile sources and for computing the
 * geometry of OpenSeadragon tiled images
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

  /**
   * Computes the effective flip, width, rotation, and position for a tiled image based on its transforms and content size
   *
   * Composes the data → layer → world similarity matrices (including flip),
   * then decomposes the result around the image center to match
   * OpenSeadragon's flip/rotation-around-image-center convention. The
   * decomposed translation is then the OpenSeadragon position directly.
   *
   * @param objectTransform - The data → layer transform of the object
   * @param layerTransform - The layer → world transform of the object's layer
   * @param contentSize - The size of the content (image or labels) in pixels
   * @returns An object containing the computed flip, width, rotation, and position for the tiled image
   */
  static getTiledImageTransform(
    objectTransform: SimilarityTransform,
    layerTransform: SimilarityTransform,
    contentSize: { x: number; y: number },
  ): {
    flip: boolean;
    width: number;
    rotation: number;
    position: OpenSeadragon.Point;
  } {
    const m = mat3.create();
    mat3.multiply(
      m,
      TransformUtils.toSimilarityMatrix(layerTransform),
      TransformUtils.toSimilarityMatrix(objectTransform),
    );
    const { flip, scale, rotation, translation } =
      TransformUtils.fromSimilarityMatrix(m, {
        center: { x: contentSize.x / 2, y: contentSize.y / 2 },
      });
    return {
      flip,
      width: contentSize.x * scale,
      rotation,
      position: new OpenSeadragon.Point(translation.x, translation.y),
    };
  }
}

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
  /** A single transparent pixel, as a PNG data URL */
  static readonly transparentBlackPixelUrl = OpenSeadragonUtils.createPixelUrl(
    0,
    0,
    0,
    0,
  );

  /** A single opaque black pixel, as a PNG data URL */
  static readonly opaqueBlackPixelUrl = OpenSeadragonUtils.createPixelUrl(
    0,
    0,
    0,
    1,
  );

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
   * Composes the data → layer → world similarity matrices (including flip)
   * and decomposes the result with flip and rotation pivoted at the image
   * center, matching OpenSeadragon's flip/rotation-around-image-center
   * convention. The decomposed translation is then the OpenSeadragon
   * position directly.
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
    const m = mat3.multiply(
      mat3.create(),
      TransformUtils.compose(layerTransform),
      TransformUtils.compose(objectTransform),
    );
    const pivot = { x: contentSize.x / 2, y: contentSize.y / 2 };
    const { flip, scale, rotation, translation } = TransformUtils.decompose(
      m,
      pivot,
    );
    return {
      flip,
      width: contentSize.x * scale,
      rotation,
      position: new OpenSeadragon.Point(translation.x, translation.y),
    };
  }

  /**
   * Creates a PNG data URL of a single pixel in the given color
   *
   * The pixel is drawn onto a 1x1 canvas and exported as PNG, so this requires
   * a DOM with canvas support. As canvases store premultiplied colors, the
   * color components of a translucent pixel may not round-trip exactly; fully
   * transparent and fully opaque pixels do.
   *
   * @param r - Red component, between 0 and 255
   * @param g - Green component, between 0 and 255
   * @param b - Blue component, between 0 and 255
   * @param a - Alpha component, between 0 (transparent) and 1 (opaque)
   * @returns The PNG data URL
   * @throws Error if no 2D canvas context could be created
   */
  static createPixelUrl(r: number, g: number, b: number, a: number): string {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (ctx === null) {
      throw new Error("Failed to create canvas context");
    }
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
    ctx.fillRect(0, 0, 1, 1);
    return canvas.toDataURL("image/png");
  }
}

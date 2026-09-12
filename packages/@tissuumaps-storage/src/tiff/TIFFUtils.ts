import { type GeoTIFF, GeoTIFFImage, globals } from "geotiff";

import { RenderUtils } from "@tissuumaps/core";

import type { TIFFChannel } from "./formats/TIFFParser";

const { WhiteIsZero, RGB, Palette, YCbCr } = globals.photometricInterpretations;

/** Helpers shared by the TIFF parsers */
export class TIFFUtils {
  /**
   * Reads every IFD of the file
   *
   * @param tiff - The opened file
   * @param options - An abort signal
   * @returns The images, in file order
   */
  static async readImages(
    tiff: GeoTIFF,
    options?: { signal?: AbortSignal },
  ): Promise<GeoTIFFImage[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const count = await tiff.getImageCount();
    signal?.throwIfAborted(); // getImageCount() does not throw on abort
    // IFDs are chained, so they can only be read one after another
    const images: GeoTIFFImage[] = [];
    for (let i = 0; i < count; i++) {
      images.push(await tiff.getImage(i));
      signal?.throwIfAborted(); // getImage() does not throw on abort
    }
    return images;
  }

  /**
   * Reads the `ImageDescription` of an image
   *
   * @param image - The image
   * @param options - An abort signal
   * @returns The description without its trailing NUL, or `undefined`
   */
  static async readDescription(
    image: GeoTIFFImage,
    options?: { signal?: AbortSignal },
  ): Promise<string | undefined> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const description: string | undefined = await image
      .getFileDirectory()
      .loadValue("ImageDescription");
    signal?.throwIfAborted(); // loadValue() does not throw on abort
    return description?.replace(/\0+$/, ""); // TIFF pads ASCII with a NUL
  }

  /**
   * Reads the `ImageDescription` of every image
   *
   * @param images - The images
   * @param options - An abort signal
   * @returns One description per image
   */
  static readDescriptions(
    images: GeoTIFFImage[],
    options?: { signal?: AbortSignal },
  ): Promise<(string | undefined)[]> {
    const { signal } = options ?? {};
    if (signal?.aborted) {
      return Promise.reject(signal.reason as Error);
    }
    return Promise.all(
      images.map((image) => TIFFUtils.readDescription(image, { signal })),
    );
  }

  /**
   * Reads the `ImageDescription` of the first IFD, in which OME-TIFF and
   * QPTIFF identify themselves
   *
   * @param tiff - The opened file
   * @param options - An abort signal
   * @returns The description, or `undefined` if the file is empty or has none
   */
  static async readFirstDescription(
    tiff: GeoTIFF,
    options?: { signal?: AbortSignal },
  ): Promise<string | undefined> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const count = await tiff.getImageCount();
    signal?.throwIfAborted(); // getImageCount() does not throw on abort
    if (count === 0) {
      return undefined;
    }
    const image = await tiff.getImage(0);
    signal?.throwIfAborted(); // getImage() does not throw on abort
    return TIFFUtils.readDescription(image, { signal });
  }

  /**
   * Reads the SubIFD pyramids of the planes
   *
   * @param tiff - The opened file
   * @param planes - The full-resolution images, one per channel
   * @param options - An abort signal
   * @returns One pyramid per plane, the plane first, then its SubIFDs largest
   * first; `undefined` if the planes have no SubIFDs
   * @throws Error if the planes have different numbers of SubIFDs
   */
  static async readSubIFDPyramids(
    tiff: GeoTIFF,
    planes: GeoTIFFImage[],
    options?: { signal?: AbortSignal },
  ): Promise<GeoTIFFImage[][] | undefined> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const offsetsPerPlane = await Promise.all(
      planes.map(async (plane) => {
        const offsets: ArrayLike<number | bigint> | undefined = await plane
          .getFileDirectory()
          .loadValue("SubIFDs");
        return offsets === undefined ? [] : Array.from(offsets, Number);
      }),
    );
    signal?.throwIfAborted(); // loadValue() does not throw on abort
    const count = offsetsPerPlane[0]?.length ?? 0;
    if (offsetsPerPlane.some((offsets) => offsets.length !== count)) {
      throw new Error(
        `The channels have different numbers of SubIFDs (${offsetsPerPlane.map((o) => o.length).join(", ")}).`,
      );
    }
    if (count === 0) {
      return undefined;
    }
    // geotiff.js has no SubIFD support, so the directories are parsed the way
    // GeoTIFF.getImage() does it
    const levels = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        Promise.all(
          offsetsPerPlane.map(async (offsets) => {
            const directory = await tiff.parser.parseFileDirectoryAt(
              offsets[i]!,
            );
            return new GeoTIFFImage(
              directory,
              tiff.littleEndian,
              tiff.cache,
              tiff.source,
            );
          }),
        ),
      ),
    );
    signal?.throwIfAborted(); // parseFileDirectoryAt() does not throw on abort
    const kept = levels
      .filter((level) => TIFFUtils.hasSameAspectRatio(level[0]!, planes[0]!))
      .sort((a, b) => b[0]!.getWidth() - a[0]!.getWidth());
    return planes.map((plane, c) => [plane, ...kept.map((level) => level[c]!)]);
  }

  /**
   * Splits images into the full-resolution ones and the rest
   *
   * @param images - The images
   * @returns The images of the largest width and height, and the smaller ones
   */
  static partitionBySize(images: GeoTIFFImage[]): {
    full: GeoTIFFImage[];
    reduced: GeoTIFFImage[];
  } {
    const width = Math.max(...images.map((image) => image.getWidth()));
    const height = Math.max(
      ...images
        .filter((image) => image.getWidth() === width)
        .map((image) => image.getHeight()),
    );
    const isFull = (image: GeoTIFFImage) =>
      image.getWidth() === width && image.getHeight() === height;
    return {
      full: images.filter(isFull),
      reduced: images.filter((image) => !isFull(image)),
    };
  }

  /**
   * Groups reduced copies into pyramid levels
   *
   * Copies are grouped by width, since heights are rounded independently per
   * plane. A group is a level if it has one image per plane and the planes'
   * aspect ratio; label and macro images fail that.
   *
   * @param planes - The full-resolution images, one per channel
   * @param reduced - The reduced copies, in any order
   * @returns One pyramid per plane, the plane first, then its levels largest
   * first, paired to the planes in IFD order
   */
  static groupByWidth(
    planes: GeoTIFFImage[],
    reduced: GeoTIFFImage[],
  ): GeoTIFFImage[][] {
    const groups = new Map<number, GeoTIFFImage[]>();
    for (const image of reduced) {
      if (TIFFUtils.hasSameAspectRatio(image, planes[0]!)) {
        const width = image.getWidth();
        groups.set(width, [...(groups.get(width) ?? []), image]);
      }
    }
    const levels = [...groups.values()]
      .filter((group) => group.length === planes.length)
      .sort((a, b) => b[0]!.getWidth() - a[0]!.getWidth());
    return planes.map((plane, c) => [
      plane,
      ...levels.map((level) => level[c]!),
    ]);
  }

  /**
   * Whether two images have the same aspect ratio, within 2%
   *
   * @param image - The image
   * @param reference - The image to compare with
   * @returns Whether the aspect ratios match
   */
  static hasSameAspectRatio(
    image: GeoTIFFImage,
    reference: GeoTIFFImage,
  ): boolean {
    const ratio = image.getWidth() / image.getHeight();
    const referenceRatio = reference.getWidth() / reference.getHeight();
    return Math.abs(ratio - referenceRatio) / referenceRatio <= 0.02;
  }

  /**
   * Whether the pyramids make up one image that the tile source draws in its
   * own colors, so that it has no channels
   *
   * @param pyramids - One pyramid per plane
   * @returns Whether there is a single plane and it is RGB or YCbCr with 3 or 4
   * samples per pixel, a palette image, or a white-is-zero grayscale image
   */
  static hasOwnColors(pyramids: GeoTIFFImage[][]): boolean {
    if (pyramids.length !== 1) {
      return false;
    }
    const plane = pyramids[0]![0]!;
    const photometric = plane
      .getFileDirectory()
      .getValue("PhotometricInterpretation");
    const samples = plane.getSamplesPerPixel();
    if (photometric === RGB || photometric === YCbCr) {
      return samples === 3 || samples === 4;
    }
    return photometric === Palette || photometric === WhiteIsZero;
  }

  /**
   * Checks that the pyramids can be displayed
   *
   * @param pyramids - One pyramid per plane, largest image first
   * @throws Error if there is no pyramid, if the levels of a pyramid do not
   * shrink, or if the image does not draw in its own colors and a plane is not
   * a single black-is-zero band
   */
  static validatePyramids(pyramids: GeoTIFFImage[][]): void {
    if (pyramids.length === 0) {
      throw new Error("The TIFF file contains no image.");
    }
    pyramids.forEach((pyramid, c) => {
      const widths = pyramid.map((image) => image.getWidth());
      if (widths.some((width, i) => i > 0 && width >= widths[i - 1]!)) {
        throw new Error(
          `The pyramid levels of channel ${c} do not shrink (widths ${widths.join(", ")}).`,
        );
      }
    });
    if (TIFFUtils.hasOwnColors(pyramids)) {
      return;
    }
    pyramids.forEach((pyramid, c) => {
      const plane = pyramid[0]!;
      const samples = plane.getSamplesPerPixel();
      if (samples !== 1) {
        throw new Error(`Channel ${c} has ${samples} samples per pixel.`);
      }
      const photometric = plane
        .getFileDirectory()
        .getValue("PhotometricInterpretation");
      if (photometric === Palette) {
        throw new Error(`Channel ${c} is a palette image.`);
      }
      if (photometric === WhiteIsZero) {
        throw new Error(`Channel ${c} is a white-is-zero image.`);
      }
    });
  }

  /**
   * Colors the channels the file leaves uncolored
   *
   * A single uncolored channel is white. If the file colors some channels but
   * not others, the others get the default color of their index, so that file
   * colors never mix with the renderer's fallback. Channels of a file that
   * colors none of them stay uncolored, and the renderer tells them apart.
   *
   * @param channels - The channels
   * @returns The channels
   */
  static fillMissingColors(channels: TIFFChannel[]): TIFFChannel[] {
    const [only] = channels;
    if (channels.length === 1 && only!.color === undefined) {
      return [{ ...only, color: { r: 255, g: 255, b: 255 } }];
    }
    if (!channels.some((channel) => channel.color !== undefined)) {
      return channels;
    }
    return channels.map((channel, c) => ({
      ...channel,
      color: channel.color ?? RenderUtils.getDefaultChannelColor(c),
    }));
  }
}

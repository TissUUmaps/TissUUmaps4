import {
  type ColorConfig,
  type ConstantConfig,
  type FromConfig,
  type GroupByConfig,
  type RandomConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
  isRandomConfig,
} from "../../model/configs";
import { type Color, type DefaultMap } from "../../model/types";
import { type ColorPalette, colorPalettes } from "../../palettes";
import { type TableData } from "../../storage/table";
import { ColorUtils } from "../ColorUtils";
import { HashUtils } from "../HashUtils";
import { MathUtils } from "../MathUtils";
import { DataUtilsBase } from "./DataUtilsBase";

export class ColorDataUtils extends DataUtilsBase {
  /**
   * Loads color data for a set of IDs based on the active color configuration source.
   *
   * Dispatches to the appropriate loader (constant, from, groupBy, or random) and then
   * applies visibility and opacity by encoding each color as `(color << 8) + alpha`.
   *
   * @param ids - Ordered list of item IDs
   * @param config - Color configuration specifying the data source
   * @param colorMaps - Available color maps for groupBy lookups
   * @param defaultColor - Fallback color when no valid config or value is found
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options - Optional abort signal, buffer alignment, visibility data, and opacity data
   * @returns A `Uint32Array` of packed RGBA color values, one per ID
   */
  static async loadColorData(
    ids: number[],
    config: ColorConfig,
    colorMaps: DefaultMap<Color>[],
    defaultColor: Color,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: {
      signal?: AbortSignal;
      align?: number;
      visibilityData?: Uint8Array;
      opacityData?: Uint8Array;
    },
  ): Promise<Uint32Array> {
    const { signal, align = 1, visibilityData, opacityData } = options ?? {};
    signal?.throwIfAborted();
    let data;
    const activeConfigSource = getActiveConfigSource(config);
    if (activeConfigSource === "constant" && isConstantConfig(config)) {
      data = ColorDataUtils.loadConstantColorData(ids, config, { align });
    } else if (activeConfigSource === "from" && isFromConfig(config)) {
      data = await ColorDataUtils.loadFromColorData(
        ids,
        config,
        defaultColor,
        loadTable,
        { signal, align },
      );
      signal?.throwIfAborted();
    } else if (activeConfigSource === "groupBy" && isGroupByConfig(config)) {
      data = await ColorDataUtils.loadGroupByColorData(
        ids,
        config,
        colorMaps,
        colorPalettes,
        defaultColor,
        loadTable,
        { signal, align },
      );
      signal?.throwIfAborted();
    } else if (activeConfigSource === "random" && isRandomConfig(config)) {
      data = ColorDataUtils.loadRandomColorData(ids, config, defaultColor, {
        align,
      });
    } else {
      console.warn("No valid color config found, using default color");
      data = ColorDataUtils.createUniformColorData(ids.length, defaultColor, {
        align,
      });
    }
    for (let i = 0; i < ids.length; i++) {
      let c = MathUtils.safeLeftShift(data[i]!, 8);
      if (visibilityData === undefined || visibilityData[i]! > 0) {
        c += opacityData !== undefined ? opacityData[i]! : 255;
      }
      data[i] = c;
    }
    return data;
  }

  /**
   * Creates a uniform color data buffer filled with the configured constant color.
   *
   * @param ids - Ordered list of item IDs (only the length is used)
   * @param config - Constant color configuration containing the color value
   * @param options - Optional buffer alignment
   * @returns A `Uint32Array` filled with the encoded constant color
   */
  static loadConstantColorData(
    ids: number[],
    config: Extract<ColorConfig, ConstantConfig<Color>>,
    options?: { align?: number },
  ): Uint32Array {
    const { align = 1 } = options ?? {};
    return ColorDataUtils.createUniformColorData(
      ids.length,
      config.constant.value,
      { align },
    );
  }

  /**
   * Loads color data by reading numeric values from a table column and mapping them
   * through a color palette.
   *
   * @param ids - Ordered list of item IDs
   * @param config - From configuration specifying the source table, column, palette, and range
   * @param defaultColor - Fallback color when the palette is not found or a value is invalid
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options - Optional abort signal and buffer alignment
   * @returns A `Uint32Array` of encoded color values
   */
  static async loadFromColorData(
    ids: number[],
    config: Extract<ColorConfig, FromConfig>,
    defaultColor: Color,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number },
  ): Promise<Uint32Array> {
    const { signal, align = 1 } = options ?? {};
    signal?.throwIfAborted();
    const colorPalette = colorPalettes.find(
      (colorPalette) => colorPalette.id === config.from.palette,
    );
    if (colorPalette === undefined) {
      console.warn(
        `Color palette ${config.from.palette} not found, using default color`,
      );
      return ColorDataUtils.createUniformColorData(ids.length, defaultColor, {
        align,
      });
    }
    const data = ColorDataUtils._createColorDataBuffer(ids.length, { align });
    await ColorDataUtils.fillFromConfigData(
      data,
      ids,
      config,
      defaultColor,
      loadTable,
      (value, valueRange) =>
        ColorDataUtils.parseColorValue(
          value,
          valueRange,
          config.from.range,
          colorPalette,
        ),
      (color) => ColorDataUtils.encodeColor(color),
      { signal },
    );
    signal?.throwIfAborted();
    return data;
  }

  /**
   * Loads color data by grouping IDs via a table column and mapping each group
   * to a color using either a color map or a color palette.
   *
   * @param ids - Ordered list of item IDs
   * @param config - GroupBy configuration specifying the source table, column, and map or palette
   * @param colorMaps - Available color maps for group-to-color lookups
   * @param colorPalettes - Available color palettes for hash-based group coloring
   * @param defaultColor - Fallback color when the map/palette is not found or a group is unmapped
   * @param loadTable - Async function that loads a {@link TableData} by ID
   * @param options - Optional abort signal and buffer alignment
   * @returns A `Uint32Array` of encoded color values
   */
  static async loadGroupByColorData(
    ids: number[],
    config: Extract<ColorConfig, GroupByConfig<false>>,
    colorMaps: DefaultMap<Color>[],
    colorPalettes: ColorPalette[],
    defaultColor: Color,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal; align?: number },
  ): Promise<Uint32Array> {
    const { signal, align = 1 } = options ?? {};
    signal?.throwIfAborted();
    if (config.groupBy.map !== undefined) {
      const colorMap = colorMaps.find(
        (colorMap) => colorMap.id === config.groupBy.map,
      );
      if (colorMap === undefined) {
        console.warn(
          `Color map ${config.groupBy.map} not found, using default color`,
        );
        return ColorDataUtils.createUniformColorData(ids.length, defaultColor, {
          align,
        });
      }
      const groupColors = new Map(Object.entries(colorMap.values));
      const data = ColorDataUtils._createColorDataBuffer(ids.length, {
        align,
      });
      await ColorDataUtils.fillGroupByConfigData(
        data,
        ids,
        config,
        colorMap.default ?? defaultColor,
        loadTable,
        (group) => groupColors.get(group),
        (color) => ColorDataUtils.encodeColor(color),
        { signal },
      );
      signal?.throwIfAborted();
      return data;
    }
    if (config.groupBy.palette !== undefined) {
      const colorPalette = colorPalettes.find(
        (colorPalette) => colorPalette.id === config.groupBy.palette,
      );
      if (colorPalette === undefined) {
        console.warn(
          `Color palette ${config.groupBy.palette} not found, using default color`,
        );
        return ColorDataUtils.createUniformColorData(ids.length, defaultColor, {
          align,
        });
      }
      const data = ColorDataUtils._createColorDataBuffer(ids.length, {
        align,
      });
      await ColorDataUtils.fillGroupByConfigData(
        data,
        ids,
        config,
        defaultColor,
        loadTable,
        (group) =>
          colorPalette.colors[
            HashUtils.djb2(group) % colorPalette.colors.length
          ]!,
        (color) => ColorDataUtils.encodeColor(color),
        { signal },
      );
      signal?.throwIfAborted();
      return data;
    }
    console.warn(
      `No color map or color palette specified, using default color`,
    );
    return ColorDataUtils.createUniformColorData(ids.length, defaultColor, {
      align,
    });
  }

  /**
   * Loads color data by assigning each ID a random color from the configured palette.
   *
   * @param ids - Ordered list of item IDs
   * @param config - Random configuration specifying the palette to sample from
   * @param defaultColor - Fallback color when the palette is not found
   * @param options - Optional buffer alignment
   * @returns A `Uint32Array` of encoded random color values
   */
  static loadRandomColorData(
    ids: number[],
    config: Extract<ColorConfig, RandomConfig<unknown>>,
    defaultColor: Color,
    options?: { align?: number },
  ): Uint32Array {
    const { align = 1 } = options ?? {};
    const colorPalette = colorPalettes.find(
      (colorPalette) => colorPalette.id === config.random.palette,
    );
    if (colorPalette === undefined) {
      console.warn(
        `Color palette ${config.random.palette} not found, using default color`,
      );
      return ColorDataUtils.createUniformColorData(ids.length, defaultColor, {
        align,
      });
    }
    const data = ColorDataUtils._createColorDataBuffer(ids.length, { align });
    for (let i = 0; i < ids.length; i++) {
      const colorIndex = MathUtils.clamp(
        Math.round(Math.random() * colorPalette.colors.length),
        0,
        colorPalette.colors.length - 1,
      );
      const color = colorPalette.colors[colorIndex]!;
      data[i] = ColorDataUtils.encodeColor(color);
    }
    return data;
  }

  /**
   * Creates a color data buffer of the given size filled with a single color.
   *
   * @param size - Number of elements
   * @param color - The color to fill with
   * @param options - Optional buffer alignment
   * @returns A `Uint32Array` filled with the encoded color
   */
  static createUniformColorData(
    size: number,
    color: Color,
    options?: { align?: number },
  ): Uint32Array {
    const { align = 1 } = options ?? {};
    const data = ColorDataUtils._createColorDataBuffer(size, { align });
    const value = ColorDataUtils.encodeColor(color);
    data.fill(value, 0, size);
    return data;
  }

  /**
   * Parses a raw numeric value into a {@link Color} by normalizing it within the
   * given range and indexing into a color palette.
   *
   * @param value - The raw value to parse (must be a finite number)
   * @param valueRange - The data-derived value range `[min, max]`, used when no configured range is provided
   * @param configuredValueRange - An explicit value range `[min, max]` that overrides `valueRange`
   * @param colorPalette - The palette to index into
   * @returns The corresponding {@link Color}, or `undefined` if `value` is not a finite number
   */
  static parseColorValue(
    value: unknown,
    valueRange: [number, number] | undefined,
    configuredValueRange: [number, number] | undefined,
    colorPalette: ColorPalette,
  ): Color | undefined {
    if (typeof value === "number" && Number.isFinite(value)) {
      const [vmin, vmax] = configuredValueRange ?? valueRange ?? [0, 1];
      const vnorm = (value - vmin) / (vmax - vmin);
      const index = MathUtils.clamp(
        Math.floor(vnorm * colorPalette.colors.length),
        0,
        colorPalette.colors.length - 1,
      );
      return colorPalette.colors[index]!;
    }
    console.warn(`Invalid color value: ${String(value)}`);
    return undefined;
  }

  /**
   * Encodes a {@link Color} into a packed numeric representation.
   *
   * @param color - The color to encode
   * @returns The packed color as a single number
   */
  static encodeColor(color: Color): number {
    return ColorUtils.packColor(color);
  }

  private static _createColorDataBuffer(
    size: number,
    options?: { align?: number },
  ): Uint32Array {
    const { align = 1 } = options ?? {};
    const alignedSize = MathUtils.align(size, align);
    return new Uint32Array(alignedSize);
  }
}

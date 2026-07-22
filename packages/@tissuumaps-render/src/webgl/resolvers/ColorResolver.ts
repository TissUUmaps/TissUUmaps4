import {
  AsyncUtils,
  type Color,
  type ColorConfig,
  type ColorPalette,
  ColorUtils,
  type ConstantConfig,
  type DefaultMap,
  type FromConfig,
  type GroupByConfig,
  HashUtils,
  MathUtils,
  ParseUtils,
  type RandomConfig,
  type TableData,
  colorPalettes,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
  isRandomConfig,
} from "@tissuumaps/core";

import { ResolverBase } from "./ResolverBase";

export class ColorResolver extends ResolverBase {
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
   * @param options - Optional abort signal, buffer alignment, table ID, visibility data, and opacity data
   * @returns A `Uint32Array` of packed RGBA color values, one per ID
   */
  static async resolveColors(
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
      table?: string;
      visibilities?: Uint8Array;
      opacities?: Uint8Array;
    },
  ): Promise<Uint32Array> {
    const { signal, align = 1, table, visibilities, opacities } = options ?? {};
    signal?.throwIfAborted();
    let data: Uint32Array;
    const activeConfigSource = getActiveConfigSource(config);
    if (activeConfigSource === "constant" && isConstantConfig(config)) {
      data = ColorResolver.resolveUniformColors(ids, config, { align });
    } else if (
      activeConfigSource === "from" &&
      isFromConfig(config) &&
      table !== undefined
    ) {
      data = await ColorResolver.resolveColorsFromTableValues(
        ids,
        config,
        defaultColor,
        async (options) => loadTable(table, options),
        { signal, align },
      );
    } else if (
      activeConfigSource === "groupBy" &&
      isGroupByConfig(config) &&
      table !== undefined
    ) {
      data = await ColorResolver.resolveColorsFromTableGroups(
        ids,
        config,
        colorMaps,
        colorPalettes,
        defaultColor,
        async (options) => loadTable(table, options),
        { signal, align },
      );
    } else if (activeConfigSource === "random" && isRandomConfig(config)) {
      data = await ColorResolver.resolveRandomColors(
        ids,
        config,
        defaultColor,
        { signal, align },
      );
    } else {
      console.warn("No valid color config found, using default color");
      data = ColorResolver.createUniformColors(ids.length, defaultColor, {
        align,
      });
    }
    await AsyncUtils.forEach(
      ids,
      (_, i) => {
        let c = MathUtils.safeLeftShift(data[i]!, 8);
        if (visibilities === undefined || visibilities[i]! > 0) {
          c += opacities !== undefined ? opacities[i]! : 255;
        }
        data[i] = c;
      },
      { signal },
    );
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
  static resolveUniformColors(
    ids: number[],
    config: Extract<ColorConfig, ConstantConfig<Color>>,
    options?: { align?: number },
  ): Uint32Array {
    const { align = 1 } = options ?? {};
    return ColorResolver.createUniformColors(
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
   
   * @param config - From configuration specifying the source column, palette, and range
   * @param defaultColor - Fallback color when the palette is not found or a value is invalid
   * @param loadTable - Async function that loads the {@link TableData}
   * @param options - Optional abort signal and buffer alignment
   * @returns A `Uint32Array` of encoded color values
   */
  static async resolveColorsFromTableValues(
    ids: number[],
    config: Extract<ColorConfig, FromConfig>,
    defaultColor: Color,
    loadTable: (options?: { signal?: AbortSignal }) => Promise<TableData>,
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
      return ColorResolver.createUniformColors(ids.length, defaultColor, {
        align,
      });
    }
    const data = ColorResolver.createColorBuffer(ids.length, { align });
    await ColorResolver.fillFromTableValues(
      data,
      ids,
      config.from.column,
      defaultColor,
      loadTable,
      (value, valueRange) =>
        ColorResolver.parseColor(
          value,
          valueRange,
          config.from.range,
          colorPalette,
        ),
      (color) => ColorResolver.encodeColor(color),
      { signal },
    );
    return data;
  }

  /**
   * Loads color data by grouping IDs via a table column and mapping each group
   * to a color using either a color map or a color palette.
   *
   * @param ids - Ordered list of item IDs
   * @param config - GroupBy configuration specifying the source column and map/palette
   * @param colorMaps - Available color maps for group-to-color lookups
   * @param colorPalettes - Available color palettes for hash-based group coloring
   * @param defaultColor - Fallback color when the map/palette is not found or a group is unmapped
   * @param loadTable - Async function that loads the {@link TableData}
   * @param options - Optional abort signal and buffer alignment
   * @returns A `Uint32Array` of encoded color values
   */
  static async resolveColorsFromTableGroups(
    ids: number[],
    config: Extract<ColorConfig, GroupByConfig<false>>,
    colorMaps: DefaultMap<Color>[],
    colorPalettes: ColorPalette[],
    defaultColor: Color,
    loadTable: (options?: { signal?: AbortSignal }) => Promise<TableData>,
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
        return ColorResolver.createUniformColors(ids.length, defaultColor, {
          align,
        });
      }
      const data = ColorResolver.createColorBuffer(ids.length, {
        align,
      });
      const groupColors = new Map(Object.entries(colorMap.values));
      await ColorResolver.fillFromTableGroups(
        data,
        ids,
        config.groupBy.column,
        colorMap.default ?? defaultColor,
        loadTable,
        (group) => groupColors.get(group),
        (color) => ColorResolver.encodeColor(color),
        { signal },
      );
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
        return ColorResolver.createUniformColors(ids.length, defaultColor, {
          align,
        });
      }
      const data = ColorResolver.createColorBuffer(ids.length, {
        align,
      });
      await ColorResolver.fillFromTableGroups(
        data,
        ids,
        config.groupBy.column,
        defaultColor,
        loadTable,
        (group) => HashUtils.djb2Pick(colorPalette.colors, group),
        (color) => ColorResolver.encodeColor(color),
        { signal },
      );
      return data;
    }
    console.warn(
      `No color map or color palette specified, using default color`,
    );
    return ColorResolver.createUniformColors(ids.length, defaultColor, {
      align,
    });
  }

  /**
   * Loads color data by assigning each ID a random color from the configured palette.
   *
   * @param ids - Ordered list of item IDs
   * @param config - Random configuration specifying the palette to sample from
   * @param defaultColor - Fallback color when the palette is not found
   * @param options - Optional abort signal and buffer alignment
   * @returns A `Uint32Array` of encoded random color values
   */
  static async resolveRandomColors(
    ids: number[],
    config: Extract<ColorConfig, RandomConfig<unknown>>,
    defaultColor: Color,
    options?: { signal?: AbortSignal; align?: number },
  ): Promise<Uint32Array> {
    const { signal, align = 1 } = options ?? {};
    signal?.throwIfAborted();
    const colorPalette = colorPalettes.find(
      (colorPalette) => colorPalette.id === config.random.palette,
    );
    if (colorPalette === undefined) {
      console.warn(
        `Color palette ${config.random.palette} not found, using default color`,
      );
      return ColorResolver.createUniformColors(ids.length, defaultColor, {
        align,
      });
    }
    const data = ColorResolver.createColorBuffer(ids.length, { align });
    await AsyncUtils.forEach(
      ids,
      (_, i) => {
        const index = Math.floor(Math.random() * colorPalette.colors.length);
        const color = colorPalette.colors[index]!;
        data[i] = ColorResolver.encodeColor(color);
      },
      { signal },
    );
    return data;
  }

  /**
   * Creates a color data buffer of the given size filled with a single color.
   *
   * @param n - Number of elements
   * @param color - The color to fill with
   * @param options - Optional buffer alignment
   * @returns A `Uint32Array` filled with the encoded color
   */
  static createUniformColors(
    n: number,
    color: Color,
    options?: { align?: number },
  ): Uint32Array {
    const { align = 1 } = options ?? {};
    const data = ColorResolver.createColorBuffer(n, { align });
    const value = ColorResolver.encodeColor(color);
    data.fill(value, 0, n);
    return data;
  }

  /**
   * Creates a buffer of the given size for storing encoded color values, aligned to the specified byte boundary.
   *
   * @param size - The number of elements in the buffer
   * @param options - Optional buffer alignment
   * @returns A `Uint32Array` of the specified size, aligned to the given byte boundary
   */
  static createColorBuffer(
    size: number,
    options?: { align?: number },
  ): Uint32Array {
    const { align = 1 } = options ?? {};
    const alignedSize = MathUtils.align(size, align);
    return new Uint32Array(alignedSize);
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
  static parseColor(
    value: unknown,
    valueRange: [number, number] | undefined,
    configuredValueRange: [number, number] | undefined,
    colorPalette: ColorPalette,
  ): Color | undefined {
    const v = ParseUtils.tryParseFinite(value, { requireSafeBigInt: true });
    if (v !== undefined) {
      const [vmin, vmax] = configuredValueRange ?? valueRange ?? [0, 1];
      const vnorm = (v - vmin) / (vmax - vmin);
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
}

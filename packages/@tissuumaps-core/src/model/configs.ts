import { type colorPalettes } from "../palettes";
import {
  type Color,
  type CoordinateSpace,
  type Marker,
  type ValueMap,
} from "./types";

/** Configuration */
export type Config<TSource extends string> = {
  /** Prioritized configuration source (see {@link getActiveConfigSource}) */
  source?: TSource;
};

/**
 * Determines the active source of the given {@link Config}
 *
 * If a source is explicitly prioritized using {@link Config.source}, that source is returned.
 *
 * Otherwise, the active source is determined by checking for the presence of configuration-specific fields in the following order:
 * - {@link ValueConfig}
 * - {@link FromConfig}
 * - {@link GroupByConfig}
 * - {@link RandomConfig}
 *
 * @param config - The configuration
 * @returns The active configuration source, or `undefined` if none is active
 */
export function getActiveConfigSource<TSource extends string>(
  config: Config<TSource>,
): TSource | undefined {
  if (config.source !== undefined) {
    return config.source;
  }
  if (isValueConfig(config)) {
    return "value" as TSource;
  }
  if (isFromConfig(config)) {
    return "from" as TSource;
  }
  if (isGroupByConfig(config)) {
    return "groupBy" as TSource;
  }
  if (isRandomConfig(config)) {
    return "random" as TSource;
  }
  return undefined;
}

/** Configuration to use a single value */
export type ValueConfig<TValue> = Config<"value"> & {
  /** Specification of a single value */
  value: NonNullable<TValue>;
};

/**
 * Determines whether the given object is a {@link ValueConfig}
 *
 * @param obj - The object to check
 * @returns Whether the object is an (active) {@link ValueConfig}
 */
export function isValueConfig<TValue>(
  obj: unknown,
): obj is ValueConfig<TValue> {
  const valueConfig = obj as ValueConfig<TValue>;
  return valueConfig.source === "value" || valueConfig.value !== undefined;
}

/** Configuration to load values from a table column */
export type FromConfig<TFromExtra = unknown> = Config<"from"> & {
  /** Specification of what table column to load */
  from: {
    /** Table ID */
    table: string;

    /** Name of the table column */
    column: string;
  } & TFromExtra;
};

/**
 * Determines whether the given object is a {@link FromConfig}
 *
 * @param obj - The object to check
 * @returns Whether the object is a {@link FromConfig}
 */
export function isFromConfig<TFromExtra = unknown>(
  obj: unknown,
): obj is FromConfig<TFromExtra> {
  const fromConfig = obj as FromConfig<TFromExtra>;
  return fromConfig.source === "from" || fromConfig.from !== undefined;
}

/** Configuration to map a categorical table column to values */
export type GroupByConfig<
  TValue,
  TGroupByExtra = unknown,
> = Config<"groupBy"> & {
  /** Specification of what categorical table column to load and how to map groups to values */
  groupBy: {
    /** Table ID */
    table: string;

    /** Name of the categorical table column */
    column: string;

    /**
     * Group-to-value mapping
     *
     * Can be specified as either:
     * - ID of a project-global mapping
     * - A custom mapping of groups to values
     */
    map: string | ValueMap<TValue>;
  } & TGroupByExtra;
};

/**
 * Determines whether the given object is a {@link GroupByConfig}
 *
 * @param obj - The object to check
 * @returns Whether the object is a {@link GroupByConfig}
 */
export function isGroupByConfig<TValue, TGroupByExtra = unknown>(
  obj: unknown,
): obj is GroupByConfig<TValue, TGroupByExtra> {
  const groupByConfig = obj as GroupByConfig<TValue, TGroupByExtra>;
  return (
    groupByConfig.source === "groupBy" || groupByConfig.groupBy !== undefined
  );
}

/** Configuration to use random values */
export type RandomConfig<TRandom> = Config<"random"> & {
  /** Specification of random value generation */
  random: NonNullable<TRandom>;
};

/**
 * Determines whether the given object is a {@link RandomConfig}
 *
 * @param obj - The object to check
 * @returns Whether the object is a {@link RandomConfig}
 */
export function isRandomConfig<TRandom>(
  obj: unknown,
): obj is RandomConfig<TRandom> {
  const randomConfig = obj as RandomConfig<TRandom>;
  return randomConfig.source === "random" || randomConfig.random !== undefined;
}

/**
 * Marker configuration
 *
 * Table values correspond to marker indices (see {@link Marker})
 */
export type MarkerConfig =
  | ValueConfig<Marker>
  | FromConfig
  | GroupByConfig<Marker>;

/**
 * Size configuration
 *
 * Table values correspond to sizes in the specified {@link SizeConfig.unit}
 */
export type SizeConfig = (
  | ValueConfig<number>
  | FromConfig
  | GroupByConfig<number>
) & {
  /**
   * Coordinate space in which the sizes are specified
   *
   * @defaultValue {@link "./constants".defaultSizeUnit}
   */

  unit?: CoordinateSpace;
};

/**
 * Color configuration
 *
 * Numerical table values are linearly mapped to colors in the specified {@link ColorConfig.from.palette} using the specified {@link ColorConfig.from.range}.
 */
export type ColorConfig =
  | ValueConfig<Color>
  | FromConfig<{
      /**
       * Value range that is linearly mapped to {@link ColorConfig.from.palette}
       *
       * Values are clipped to this range before mapping them to colors.
       *
       * If not specified, min-max-scaling is used.
       */
      range?: [number, number];

      /** Color palette to which clipped and rescaled numerical values are mapped */
      palette: keyof typeof colorPalettes;
    }>
  | GroupByConfig<Color>
  | RandomConfig<{
      /** Color palette from which colors are randomly drawn */
      palette: keyof typeof colorPalettes;
    }>;

/**
 * Visibility configuration
 *
 * Numerical table values are interpreted as booleans, where `0` is `false` and any other value is `true`.
 */
export type VisibilityConfig =
  | ValueConfig<boolean>
  | FromConfig
  | GroupByConfig<boolean>;

/**
 * Opacity configuration
 *
 * Numerical table values are interpreted as opacities between `0` (fully transparent) and `1` (fully opaque).
 */
export type OpacityConfig =
  | ValueConfig<number>
  | FromConfig
  | GroupByConfig<number>;

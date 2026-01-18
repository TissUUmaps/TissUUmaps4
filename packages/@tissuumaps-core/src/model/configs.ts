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
 * - {@link ConstantConfig}
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
  if (isConstantConfig(config)) {
    return "constant" as TSource;
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

/** Configuration to use a constant value */
export type ConstantConfig<
  TValue,
  TConstantExtra = unknown,
> = Config<"constant"> & {
  /** Specification of a constant value */
  constant: { value: NonNullable<TValue> } & TConstantExtra;
};

/**
 * Determines whether the given object is a {@link ConstantConfig}
 *
 * @param obj - The object to check
 * @returns Whether the object is an (active) {@link ConstantConfig}
 */
export function isConstantConfig<TValue, TConstantExtra = unknown>(
  obj: unknown,
): obj is ConstantConfig<TValue, TConstantExtra> {
  return (obj as ConstantConfig<TValue, TConstantExtra>).constant !== undefined;
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
  return (obj as FromConfig<TFromExtra>).from !== undefined;
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
     * ID of a project-global group-to-value mapping
     *
     * If not specified, the custom mapping defined in {@link GroupByConfig.map} is used.
     */
    projectMap?: string;

    /**
     * Custom group-to-value mapping
     *
     * Only used if {@link GroupByConfig.projectMap} is not specified.
     */
    map?: ValueMap<TValue>;
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
  return (obj as GroupByConfig<TValue, TGroupByExtra>).groupBy !== undefined;
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
  return (obj as RandomConfig<TRandom>).random !== undefined;
}

/**
 * Marker configuration
 *
 * Table values correspond to marker indices (see {@link Marker})
 */
export type MarkerConfig =
  | ConstantConfig<Marker>
  | FromConfig
  | GroupByConfig<Marker>;

/**
 * Size configuration
 *
 * Table values correspond to sizes in the specified {@link SizeConfig.unit}
 */
export type SizeConfig =
  | ConstantConfig<
      number,
      {
        /**
         * Coordinate space in which the size values are specified
         *
         * @defaultValue {@link "./constants".defaultSizeUnit}
         */
        unit?: CoordinateSpace;
      }
    >
  | FromConfig<{
      /**
       * Coordinate space in which the size values are specified
       *
       * @defaultValue {@link "./constants".defaultSizeUnit}
       */
      unit?: CoordinateSpace;
    }>
  | GroupByConfig<
      number,
      {
        /**
         * Coordinate space in which the size values are specified
         *
         * @defaultValue {@link "./constants".defaultSizeUnit}
         */
        unit?: CoordinateSpace;
      }
    >;

/**
 * Color configuration
 *
 * Numerical table values are linearly mapped to colors in the specified {@link ColorConfig.from.palette} using the specified {@link ColorConfig.from.range}.
 */
export type ColorConfig =
  | ConstantConfig<Color>
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
  | ConstantConfig<boolean>
  | FromConfig
  | GroupByConfig<boolean>;

/**
 * Opacity configuration
 *
 * Numerical table values are interpreted as opacities between `0` (fully transparent) and `1` (fully opaque).
 */
export type OpacityConfig =
  | ConstantConfig<number>
  | FromConfig
  | GroupByConfig<number>;

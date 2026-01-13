import { type colorPalettes } from "../palettes";
import { type Color } from "./color";
import { type Marker } from "./marker";
import { type ValueMap } from "./valueMap";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type NotUndefined = {} | null;

export type ValueSource = "value";
export type ValueConfig<TValue extends NotUndefined> = {
  source?: ValueSource;
  value: TValue;
};
export function isValueConfig<TValue extends NotUndefined>(
  obj: unknown,
): obj is ValueConfig<TValue> {
  const valueConfig = obj as ValueConfig<TValue>;
  return valueConfig.source === "value" || valueConfig.value !== undefined;
}

export type FromSource = "from";
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type FromConfig<TFromExtra extends NotUndefined = {}> = {
  source?: FromSource;
  from: {
    table: string;
    column: string;
  } & TFromExtra;
};
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export function isFromConfig<TFromExtra extends NotUndefined = {}>(
  obj: unknown,
): obj is FromConfig<TFromExtra> {
  const fromConfig = obj as FromConfig<TFromExtra>;
  return fromConfig.source === "from" || fromConfig.from !== undefined;
}

export type GroupBySource = "groupBy";
export type GroupByConfig<
  TValue,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  TGroupByExtra extends NotUndefined = {},
> = {
  source?: GroupBySource;
  groupBy: {
    table: string;
    column: string;
    map: string | ValueMap<TValue>;
  } & TGroupByExtra;
};
export function isGroupByConfig<
  TValue,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  TGroupByExtra extends NotUndefined = {},
>(obj: unknown): obj is GroupByConfig<TValue, TGroupByExtra> {
  const groupByConfig = obj as GroupByConfig<TValue, TGroupByExtra>;
  return (
    groupByConfig.source === "groupBy" || groupByConfig.groupBy !== undefined
  );
}

export type RandomSource = "random";
export type RandomConfig<TRandom extends NotUndefined> = {
  source?: RandomSource;
  random: TRandom;
};
export function isRandomConfig<TRandom extends NotUndefined>(
  obj: unknown,
): obj is RandomConfig<TRandom> {
  const randomConfig = obj as RandomConfig<TRandom>;
  return randomConfig.source === "random" || randomConfig.random !== undefined;
}

export type MarkerSource = ValueSource | FromSource | GroupBySource;
export type MarkerConfig =
  | ValueConfig<Marker>
  | FromConfig
  | GroupByConfig<Marker>;

export type SizeSource = ValueSource | FromSource | GroupBySource;
export type SizeConfig = (
  | ValueConfig<number>
  | FromConfig
  | GroupByConfig<number>
) & {
  unit?: "data" | "layer" | "world";
};

export type ColorSource =
  | ValueSource
  | FromSource
  | GroupBySource
  | RandomSource;
export type ColorConfig =
  | ValueConfig<Color>
  | FromConfig<{
      palette: keyof typeof colorPalettes;
      range?: [number, number];
    }>
  | GroupByConfig<Color>
  | RandomConfig<{ palette: keyof typeof colorPalettes }>;

export type VisibilitySource = ValueSource | FromSource | GroupBySource;
export type VisibilityConfig =
  | ValueConfig<boolean>
  | FromConfig
  | GroupByConfig<boolean>;

export type OpacitySource = ValueSource | FromSource | GroupBySource;
export type OpacityConfig =
  | ValueConfig<number>
  | FromConfig
  | GroupByConfig<number>;

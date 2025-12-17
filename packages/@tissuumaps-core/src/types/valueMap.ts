import { type categoricalColorPalettes } from "../palettes";
import { type Color } from "./color";

export type ValueMap<TValue> = {
  values: { [key: string]: TValue };
  defaultValue?: TValue;
};

export type NamedValueMap<TValue> = {
  id: string;
  name: string;
} & ValueMap<TValue>;

export type ColorMap = ValueMap<Color> & {
  palette?: keyof typeof categoricalColorPalettes;
};

export type NamedColorMap = {
  id: string;
  name: string;
} & ColorMap;

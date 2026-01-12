export type ValueMap<TValue> = {
  values: { [key: string]: TValue };
  defaultValue?: TValue;
};

export type NamedValueMap<TValue> = {
  id: string;
  name: string;
} & ValueMap<TValue>;

import { type JsonSchema, type UISchemaElement } from "@jsonforms/core";

export interface DataLoader {
  readonly schema: JsonSchema;
  readonly uischema: UISchemaElement;
}

export interface Data {
  destroy(): void;
}

export interface ItemsData extends Data {
  getLength(): number;
  getIndex(): number[];
}

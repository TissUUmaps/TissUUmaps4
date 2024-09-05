// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ShapesSettings {}

export const defaultShapesSettings: ShapesSettings = {};

export interface Shapes {
  data: { type: string; config: unknown };
  settings: ShapesSettings;
}

export default Shapes;

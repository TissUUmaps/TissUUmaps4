export interface ShapesDataProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getData(): any; // TODO: define return type
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ShapesSettings {}

export const defaultShapesSettings: ShapesSettings = {};

export interface Shapes {
  dataProvider: ShapesDataProvider;
  settings: ShapesSettings;
}

export default Shapes;

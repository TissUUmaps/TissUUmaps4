type GeoJSON = object;
export type ShapesData = GeoJSON;

export interface ShapesProvider {
  getData(): ShapesData;
}

export type ShapesProviderOptions = unknown;

export type ShapesProviderFactory = (
  options: ShapesProviderOptions,
) => ShapesProvider;

/** Shape cloud settings */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ShapesSettings = {};

/** A named collection of shapes (a.k.a. shape cloud) */
export type Shapes = {
  /** Human-readable shape cloud name */
  name: string;

  /** Data provider configuration */
  data: { type: string; options: ShapesProviderOptions };

  /** Shape cloud settings */
  settings: ShapesSettings;
};

export const defaultShapesSettings: ShapesSettings = {};

export default Shapes;

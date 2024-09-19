type GeoJSON = object;
export type ShapesData = GeoJSON;

export interface ShapesProvider {
  getData(): ShapesData;
}

export type ShapesProviderFactory = (
  config: ShapesProviderConfig,
) => ShapesProvider;

export type ShapesProviderConfig = unknown;

/** Shape cloud settings */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ShapesSettings = {};

/** A named collection of shapes (a.k.a. shape cloud) */
export type Shapes = {
  /** Human-readable shape cloud name */
  name: string;

  /** Data provider configuration */
  data: { type: string; config: ShapesProviderConfig };

  /** Shape cloud settings */
  settings: ShapesSettings;
};

export const defaultShapesSettings: ShapesSettings = {};

export default Shapes;

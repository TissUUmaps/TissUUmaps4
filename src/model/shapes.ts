type GeoJSON = object;

export interface ShapesReader {
  getData(): GeoJSON;
}

export type ShapesReaderOptions = object;

export type ShapesReaderFactory = (
  options: ShapesReaderOptions,
) => ShapesReader;

/** Shape cloud settings */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ShapesSettings = {};

/** A named collection of shapes (a.k.a. shape cloud) */
export type Shapes = {
  /** Human-readable shape cloud name */
  name: string;

  /** Shapes reader configuration */
  data: { type: string; options: ShapesReaderOptions };

  /** Shape cloud settings */
  settings: ShapesSettings;
};

export const defaultShapesSettings: ShapesSettings = {};

export default Shapes;

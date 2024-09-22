import { ShapesReaderOptions } from "../readers/ShapesReader";

/** Shape cloud settings */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ShapesSettings = {};

/** A named collection of shapes (a.k.a. shape cloud) */
export type Shapes = {
  /** Human-readable shape cloud name */
  name: string;

  /** Shapes reader configuration */
  data: ShapesReaderOptions<string>;

  /** Shape cloud settings */
  settings: ShapesSettings;
};

export const defaultShapesSettings: ShapesSettings = {};

export default Shapes;

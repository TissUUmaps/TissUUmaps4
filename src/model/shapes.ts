import { ShapesReaderOptions } from "../readers/ShapesReader";

/** A named collection of shapes (a.k.a. shape cloud) */
export type Shapes = {
  /** Human-readable shape cloud name */
  name: string;

  /** Layers in which to show the shapes */
  layers: string[];

  /** Shapes reader configuration */
  data: ShapesReaderOptions<string>;
};

export const shapesDefaults: Omit<Shapes, "name" | "layers" | "data"> = {};

export default Shapes;

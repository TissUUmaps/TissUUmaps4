import Image from "./image";
import Layer from "./layer";
import Points from "./points";
import Shapes from "./shapes";

/** A named TissUUmaps project */
export type Project = {
  /** Human-readable project name */
  name: string;

  /** Layers (map: layer ID -> layer) */
  layers: Map<string, Layer>;

  /** Images (map: image ID -> image) */
  images: Map<string, Image>;

  /** Points (map: points ID -> points) */
  points: Map<string, Points>;

  /** Shapes (map: shapes ID -> shapes) */
  shapes: Map<string, Shapes>;
};

export const projectDefaults: Omit<Project, "name"> = {
  layers: new Map(),
  images: new Map(),
  points: new Map(),
  shapes: new Map(),
};

export default Project;

import SpliceableMap from "../utils/SpliceableMap";
import Layer from "./layer";
import Points from "./points";
import Shapes from "./shapes";

/** Project settings */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ProjectSettings = {};

/** A named TissUUmaps project */
export type Project = {
  /** Human-readable project name */
  name: string;

  /** Layers (map: layer ID -> layer) */
  layers: SpliceableMap<string, Layer>;

  /** Points (map: points ID -> points) */
  allPoints: SpliceableMap<string, Points>;

  /** Shapes (map: shapes ID -> shapes) */
  allShapes: SpliceableMap<string, Shapes>;

  /** Project settings */
  settings: ProjectSettings;
};

export const defaultProjectSettings: ProjectSettings = {};

export default Project;

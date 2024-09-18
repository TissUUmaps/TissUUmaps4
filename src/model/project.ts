import Layer from "./layer";
import Points from "./points";
import Shapes from "./shapes";

/** Project settings */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProjectSettings {}

/** A named TissUUmaps project */
export default interface Project {
  /** Human-readable project name */
  name: string;

  /** Layers (mapping: layer key -> layer) */
  layers: Map<string, Layer>;

  /** Points (mapping: points key -> points) */
  allPoints: Map<string, Points>;

  /** Shapes (mapping: shapes key -> shapes) */
  allShapes: Map<string, Shapes>;

  /** Project settings */
  settings: ProjectSettings;
}

export const defaultProjectSettings: ProjectSettings = {};

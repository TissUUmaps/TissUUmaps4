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

  /** Layers */
  layers: { [layerId: string]: Layer };

  /** Points */
  allPoints: { [pointsId: string]: Points };

  /** Shapes */
  allShapes: { [shapesId: string]: Shapes };

  /** Project settings */
  settings: ProjectSettings;
}

export const defaultProjectSettings: ProjectSettings = {};

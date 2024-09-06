import Image from "./image";
import Shapes from "./shapes";

export interface LayerSettings {
  /** layer origin in world coordinates */
  origin: { x: number; y: number };

  /** layer scale, translating layer coordinates (e.g., pixels) to world coordinates */
  scale: number;

  /** reflection along the x axis */
  flipx: boolean;

  /** rotation angle, in degrees */
  rotation: number;
}

export const defaultLayerSettings: LayerSettings = {
  origin: { x: 0, y: 0 },
  scale: 1,
  flipx: false,
  rotation: 0,
};

export interface Layer {
  images: Image[];
  shapes: Shapes[];
  settings: LayerSettings;
}

export default Layer;

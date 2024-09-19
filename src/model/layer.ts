import Image from "./image";

/** Layer settings */
export interface LayerSettings {
  /** Layer origin, in world coordinates */
  origin: { x: number; y: number };

  /** Layer scale, translating data coordinates (e.g., pixels) to world coordinates */
  scale: number;

  /** Reflection along the x axis */
  flipx: boolean;

  /** Rotation angle, in degrees */
  rotation: number;
}

/** A named group of objects (e.g., images, points, shapes) that share the same data coordinate system (positioned in world coordinate system, unbounded) */
export default interface Layer {
  /** Human-readable layer name */
  name: string;

  /** Images of this layer (map: image ID -> image) */
  images: Map<string, Image>;

  /** Layer settings */
  settings: LayerSettings;
}

export const defaultLayerSettings: LayerSettings = {
  origin: { x: 0, y: 0 },
  scale: 1,
  flipx: false,
  rotation: 0,
};

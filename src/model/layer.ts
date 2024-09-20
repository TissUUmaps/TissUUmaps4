import Image from "./image";

/** Layer settings */
export type LayerSettings = {
  /** Layer x-origin, in world coordinates */
  x: number;

  /** Layer y-origin, in world coordinates */
  y: number;

  /** Layer scale, translating data coordinates (e.g., pixels) to world coordinates */
  scale: number;

  /** Visibility */
  visibility: boolean;

  /** Opacity, between 0 and 1 */
  opacity: number;

  /** Rotation angle, in degrees */
  rotation: number;

  /** Reflection along the x axis */
  flipx: boolean;
};

/** A named group of objects (e.g., images, points, shapes) that share the same data coordinate system (positioned in world coordinate system, unbounded) */
export type Layer = {
  /** Human-readable layer name */
  name: string;

  /** Images of this layer (map: image ID -> image) */
  images: Map<string, Image>;

  /** Layer settings */
  settings: LayerSettings;
};

export const defaultLayerSettings: LayerSettings = {
  x: 0,
  y: 0,
  scale: 1,
  visibility: true,
  opacity: 1.0,
  rotation: 0,
  flipx: false,
};

export default Layer;

/** A named group of objects (e.g., images, points, shapes) that share the same data coordinate system (positioned in world coordinate system, unbounded) */
export type Layer = {
  /** Human-readable layer name */
  name: string;

  /** X-origin, in world coordinates */
  x: number;

  /** Y-origin, in world coordinates */
  y: number;

  /** Scale factor, converting physical coordinates to world coordinates */
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

export const layerDefaults: Omit<Layer, "name"> = {
  x: 0,
  y: 0,
  scale: 1,
  visibility: true,
  opacity: 1.0,
  rotation: 0,
  flipx: false,
};

export default Layer;

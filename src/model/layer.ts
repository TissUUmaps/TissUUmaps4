export default interface Layer {
  name: string; // image name
  tileSource: string; // image URL
  x?: number; // x-position in pixels
  y?: number; // y-position in pixels
  rotation?: number; // rotation in degrees
  flipX?: boolean; // flip horizontally
  scale?: number; // factor for converting pixels to viewport coordinates
  opacity?: number; // alpha value
  visible?: boolean; // visibility
  // TODO clip {x,y,w,h}
}

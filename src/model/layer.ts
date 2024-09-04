import Image from "./image";
import Shapes from "./shapes";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LayerSettings {}

export interface Layer {
  images: Image[];
  shapes: Shapes[];
  settings: LayerSettings;
}

export default Layer;

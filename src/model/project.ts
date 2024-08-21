import Image from "./image";
import Points from "./points";
import Shapes from "./shapes";

export default interface Project {
  images: Image[];
  points: Points[];
  shapes: Shapes[];
}

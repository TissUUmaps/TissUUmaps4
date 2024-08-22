import Layers from "./layers";
import Points from "./points";
import Shapes from "./shapes";

export default interface Project {
  layers: Layers[];
  points: Points[];
  shapes: Shapes[];
}

import Layer from "./layer";
import Points from "./points";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProjectSettings {}

export interface Project {
  layers: Layer[];
  points: Points[];
  settings: ProjectSettings;
}

export default Project;

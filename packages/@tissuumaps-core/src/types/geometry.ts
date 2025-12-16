export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MultiPolygon = {
  polygons: Polygon[];
};

export type Polygon = {
  shell: Path;
  holes: Path[];
};

export type Path = Vertex[];

export type Vertex = { x: number; y: number };

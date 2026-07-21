import type {
  Color,
  DefaultMap,
  Image,
  ImageData,
  InteractionMode,
  Labels,
  LabelsData,
  Layer,
  Marker,
  MultiPolygon,
  Points,
  PointsData,
  Shapes,
  ShapesData,
  TableData,
} from "@tissuumaps/core";
import type { OpenSeadragonOptions, WebGLOptions } from "@tissuumaps/render";

export interface ViewerAdapter {
  interactionMode: InteractionMode;
  workspace: FileSystemDirectoryHandle | null;
  layers: Layer[];
  images: Image[];
  labels: Labels[];
  points: Points[];
  shapes: Shapes[];
  markerMaps: DefaultMap<Marker>[];
  sizeMaps: DefaultMap<number>[];
  colorMaps: DefaultMap<Color>[];
  visibilityMaps: DefaultMap<boolean>[];
  opacityMaps: DefaultMap<number>[];
  osOptions: OpenSeadragonOptions;
  glOptions: WebGLOptions;
  loadImage: (
    imageId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<ImageData>;
  loadLabels: (
    labelsId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<LabelsData>;
  loadPoints: (
    pointsId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<PointsData>;
  loadShapes: (
    shapesId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<ShapesData>;
  loadTable: (
    tableId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<TableData>;
  addShape?: (shape: MultiPolygon) => void;
}

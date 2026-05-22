import {
  type Color,
  type DefaultMap,
  type Image,
  type ImageData,
  type InteractionMode,
  type Labels,
  type LabelsData,
  type Layer,
  type Marker,
  type MultiPolygon,
  type Points,
  type PointsData,
  type RenderOptions,
  type Shapes,
  type ShapesData,
  type TableData,
  type ViewerOptions,
} from "@tissuumaps/core";

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
  viewerOptions: ViewerOptions;
  viewerAnimationStartOptions: ViewerOptions;
  viewerAnimationFinishOptions: ViewerOptions;
  renderOptions: RenderOptions;
  getImage: (
    imageId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<ImageData>;
  getLabels: (
    labelsId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<LabelsData>;
  getPoints: (
    pointsId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<PointsData>;
  getShapes: (
    shapesId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<ShapesData>;
  getTable: (
    tableId: string,
    options?: { signal?: AbortSignal },
  ) => Promise<TableData>;
  addShape?: (shape: MultiPolygon) => void;
}

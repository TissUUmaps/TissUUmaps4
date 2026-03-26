import {
  type Color,
  type DefaultMap,
  type DrawOptions,
  type Image,
  type ImageData,
  type Labels,
  type LabelsData,
  type Layer,
  type Marker,
  type Points,
  type PointsData,
  type Shapes,
  type ShapesData,
  type TableData,
  type ViewerOptions,
} from "@tissuumaps/core";

export interface ViewerAdapter {
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
  drawOptions: DrawOptions;
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
}

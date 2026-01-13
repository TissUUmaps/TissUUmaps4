import { createContext, useContext } from "react";

import {
  type Color,
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
  type ValueMap,
  type ViewerOptions,
} from "@tissuumaps/core";

export interface ViewerAdapter {
  projectDir: FileSystemDirectoryHandle | null;
  layers: Layer[];
  images: Image[];
  labels: Labels[];
  points: Points[];
  shapes: Shapes[];
  markerMaps: Map<string, ValueMap<Marker>>;
  sizeMaps: Map<string, ValueMap<number>>;
  colorMaps: Map<string, ValueMap<Color>>;
  visibilityMaps: Map<string, ValueMap<boolean>>;
  opacityMaps: Map<string, ValueMap<number>>;
  viewerOptions: ViewerOptions;
  viewerAnimationStartOptions: ViewerOptions;
  viewerAnimationFinishOptions: ViewerOptions;
  drawOptions: DrawOptions;
  loadImage: (
    imageId: string,
    options: { signal?: AbortSignal },
  ) => Promise<ImageData>;
  loadLabels: (
    labelsId: string,
    options: { signal?: AbortSignal },
  ) => Promise<LabelsData>;
  loadPoints: (
    pointsId: string,
    options: { signal?: AbortSignal },
  ) => Promise<PointsData>;
  loadShapes: (
    shapesId: string,
    options: { signal?: AbortSignal },
  ) => Promise<ShapesData>;
  loadTable: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>;
}

export const ViewerContext = createContext<ViewerAdapter | null>(null);

export function useViewer(): ViewerAdapter {
  const context = useContext(ViewerContext);
  if (!context) {
    throw new Error("Viewer must be used within a ViewerProvider");
  }
  return context;
}

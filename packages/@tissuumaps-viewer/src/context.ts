import { createContext, useContext } from "react";

import type {
  ColorMap,
  DrawOptions,
  Image,
  ImageData,
  Labels,
  LabelsData,
  Layer,
  Marker,
  Points,
  PointsData,
  Shapes,
  ShapesData,
  TableData,
  ValueMap,
  ViewerOptions,
} from "@tissuumaps/core";

export interface ViewerAdapter {
  projectDir: FileSystemDirectoryHandle | null;
  layerMap: Map<string, Layer>;
  imageMap: Map<string, Image>;
  labelsMap: Map<string, Labels>;
  pointsMap: Map<string, Points>;
  shapesMap: Map<string, Shapes>;
  markerMaps: Map<string, ValueMap<Marker>>;
  sizeMaps: Map<string, ValueMap<number>>;
  colorMaps: Map<string, ColorMap>;
  visibilityMaps: Map<string, ValueMap<boolean>>;
  opacityMaps: Map<string, ValueMap<number>>;
  viewerOptions: ViewerOptions;
  viewerAnimationStartOptions: ViewerOptions;
  viewerAnimationFinishOptions: ViewerOptions;
  drawOptions: DrawOptions;
  loadImage: (
    image: Image,
    options: { signal?: AbortSignal },
  ) => Promise<ImageData>;
  loadLabels: (
    labels: Labels,
    options: { signal?: AbortSignal },
  ) => Promise<LabelsData>;
  loadPoints: (
    points: Points,
    options: { signal?: AbortSignal },
  ) => Promise<PointsData>;
  loadShapes: (
    shapes: Shapes,
    options: { signal?: AbortSignal },
  ) => Promise<ShapesData>;
  loadTableByID: (
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

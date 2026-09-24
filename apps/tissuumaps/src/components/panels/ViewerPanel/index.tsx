import { useMemo } from "react";
import { useShallow } from "zustand/shallow";

import { type Color, ImageChannelViewMode } from "@tissuumaps/core";
import {
  Viewer,
  type ViewerAdapter,
  ViewerControl,
  ViewerControlAnchor,
} from "@tissuumaps/viewer";

import {
  useImageDataLoader,
  useLabelsDataLoader,
  usePointsDataLoader,
  useShapesDataLoader,
  useTableDataLoader,
} from "@/hooks/useDataLoader";
import { useAppStore } from "@/stores/app";
import { useProjectStore } from "@/stores/project";

import { InteractionModeViewerControls } from "./InteractionModeViewerControls";
import { PointSizeViewerControl } from "./PointSizeViewerControl";

export type ViewerPanelProps = {
  className?: string;
};

/** The background color of the viewer, behind all rendered content */
const viewerBackgroundColor: Color = { r: 0, g: 0, b: 0 };

export function ViewerPanel({ className }: ViewerPanelProps) {
  const interactionMode = useAppStore((state) => state.interactionMode);
  const imageChannelPreview = useAppStore((state) => state.imageChannelPreview);

  const images = useProjectStore((state) => state.images);
  const previewedImages = useMemo(
    () =>
      imageChannelPreview === null
        ? images
        : images.map((image) =>
            image.id === imageChannelPreview.imageId
              ? {
                  ...image,
                  channelViewMode: ImageChannelViewMode.color,
                  activeChannel: imageChannelPreview.channelIndex,
                }
              : image,
          ),
    [images, imageChannelPreview],
  );

  const projectState = useProjectStore(
    useShallow((state) => ({
      projectInstanceId: state.instanceId,
      layers: state.layers,
      labels: state.labels,
      points: state.points,
      shapes: state.shapes,
      tables: state.tables,
      markerMaps: state.markerMaps,
      sizeMaps: state.sizeMaps,
      colorMaps: state.colorMaps,
      visibilityMaps: state.visibilityMaps,
      opacityMaps: state.opacityMaps,
      osOptions: state.osOptions,
      glOptions: state.glOptions,
    })),
  );

  const loadImage = useImageDataLoader();
  const loadLabels = useLabelsDataLoader();
  const loadPoints = usePointsDataLoader();
  const loadShapes = useShapesDataLoader();
  const loadTable = useTableDataLoader();

  const viewerAdapter: ViewerAdapter = useMemo(
    () => ({
      ...projectState,
      images: previewedImages,
      interactionMode,
      loadImage,
      loadLabels,
      loadPoints,
      loadShapes,
      loadTable,
    }),
    [
      projectState,
      previewedImages,
      interactionMode,
      loadImage,
      loadLabels,
      loadPoints,
      loadShapes,
      loadTable,
    ],
  );

  return (
    <Viewer
      adapter={viewerAdapter}
      backgroundColor={viewerBackgroundColor}
      className={className}
    >
      <ViewerControl anchor={ViewerControlAnchor.TOP_LEFT}>
        <InteractionModeViewerControls />
      </ViewerControl>
      {projectState.points.length > 0 && (
        <ViewerControl anchor={ViewerControlAnchor.TOP_RIGHT}>
          <PointSizeViewerControl />
        </ViewerControl>
      )}
    </Viewer>
  );
}

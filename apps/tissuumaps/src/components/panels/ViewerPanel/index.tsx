import { useMemo } from "react";
import { useShallow } from "zustand/shallow";

import { Viewer, ViewerControl, ViewerControlAnchor } from "@tissuumaps/viewer";

import { useTissUUmaps } from "@/store";
import { useLoadedImageDataAdapter } from "@/store/adapters/LoadedImageDataAdapter";
import { useLoadedLabelsDataAdapter } from "@/store/adapters/LoadedLabelsDataAdapter";
import { useLoadedPointsDataAdapter } from "@/store/adapters/LoadedPointsDataAdapter";
import { useLoadedShapesDataAdapter } from "@/store/adapters/LoadedShapesDataAdapter";
import { useLoadedTableDataAdapter } from "@/store/adapters/LoadedTableDataAdapter";

import { InteractionModeViewerControls } from "./InteractionModeViewerControls";

export type ViewerPanelProps = {
  className?: string;
};

export function ViewerPanel({ className }: ViewerPanelProps) {
  const viewerState = useTissUUmaps(
    useShallow((state) => ({
      interactionMode: state.interactionMode,
      workspace: state.workspace,
      layers: state.layers,
      images: state.images,
      labels: state.labels,
      points: state.points,
      shapes: state.shapes,
      markerMaps: state.markerMaps,
      sizeMaps: state.sizeMaps,
      colorMaps: state.colorMaps,
      visibilityMaps: state.visibilityMaps,
      opacityMaps: state.opacityMaps,
      viewerOptions: state.viewerOptions,
      viewerAnimationStartOptions: state.viewerAnimationStartOptions,
      viewerAnimationFinishOptions: state.viewerAnimationFinishOptions,
      drawOptions: state.drawOptions,
      // rerender upon changes to storage adapter registries
      _imageDataStorageRegistry: state.imageDataStorageRegistry,
      _labelsDataStorageRegistry: state.labelsDataStorageRegistry,
      _pointsDataStorageRegistry: state.pointsDataStorageRegistry,
      _shapesDataStorageRegistry: state.shapesDataStorageRegistry,
      _tableDataStorageRegistry: state.tableDataStorageRegistry,
    })),
  );

  const loadImage = useLoadedImageDataAdapter();
  const loadLabels = useLoadedLabelsDataAdapter();
  const loadPoints = useLoadedPointsDataAdapter();
  const loadShapes = useLoadedShapesDataAdapter();
  const loadTable = useLoadedTableDataAdapter();

  const viewerAdapter = useMemo(
    () => ({
      ...viewerState,
      loadImage,
      loadLabels,
      loadPoints,
      loadShapes,
      loadTable,
    }),
    [viewerState, loadImage, loadLabels, loadPoints, loadShapes, loadTable],
  );

  return (
    <Viewer adapter={viewerAdapter} className={className}>
      <ViewerControl anchor={ViewerControlAnchor.TOP_LEFT}>
        <InteractionModeViewerControls />
      </ViewerControl>
    </Viewer>
  );
}

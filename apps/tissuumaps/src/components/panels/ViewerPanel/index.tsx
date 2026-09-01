import { useMemo } from "react";
import { useShallow } from "zustand/shallow";

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

export type ViewerPanelProps = {
  className?: string;
};

export function ViewerPanel({ className }: ViewerPanelProps) {
  const interactionMode = useAppStore((state) => state.interactionMode);

  const projectState = useProjectStore(
    useShallow((state) => ({
      layers: state.layers,
      images: state.images,
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
      interactionMode,
      loadImage,
      loadLabels,
      loadPoints,
      loadShapes,
      loadTable,
    }),
    [
      projectState,
      interactionMode,
      loadImage,
      loadLabels,
      loadPoints,
      loadShapes,
      loadTable,
    ],
  );

  return (
    <Viewer adapter={viewerAdapter} className={className}>
      <ViewerControl anchor={ViewerControlAnchor.TOP_LEFT}>
        <InteractionModeViewerControls />
      </ViewerControl>
    </Viewer>
  );
}

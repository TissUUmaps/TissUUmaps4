import {
  DockviewDefaultTab,
  DockviewReact,
  type DockviewReadyEvent,
  type IDockviewPanelHeaderProps,
} from "dockview-react";
import { useEffect } from "react";
import { useShallow } from "zustand/shallow";

import { Viewer, ViewerProvider } from "@tissuumaps/viewer";

import "./App.css";
import { ImageCollectionPanel } from "./components/ImageCollectionPanel";
import { LabelsCollectionPanel } from "./components/LabelsCollectionPanel";
import { PointsCollectionPanel } from "./components/PointsCollectionPanel";
import { ProjectPanel } from "./components/ProjectPanel";
import { ShapesCollectionPanel } from "./components/ShapesCollectionPanel";
import { TableCollectionPanel } from "./components/TableCollectionPanel";
import { useTissUUmaps } from "./store";

declare global {
  interface Window {
    TissUUmaps?: typeof useTissUUmaps;
  }
}

const dockviewComponents = {
  viewer: () => <Viewer className="size-full bg-white" />,
  projectPanel: () => <ProjectPanel />,
  imageCollectionPanel: () => <ImageCollectionPanel />,
  labelsCollectionPanel: () => <LabelsCollectionPanel />,
  pointsCollectionPanel: () => <PointsCollectionPanel />,
  shapesCollectionPanel: () => <ShapesCollectionPanel />,
  tableCollectionPanel: () => <TableCollectionPanel />,
};

const dockviewTabComponents = {
  closableTab: (props: IDockviewPanelHeaderProps) => {
    return <DockviewDefaultTab hideClose={false} {...props} />;
  },
  nonClosableTab: (props: IDockviewPanelHeaderProps) => {
    return <DockviewDefaultTab hideClose={true} {...props} />;
  },
};

const onDockviewReady = (event: DockviewReadyEvent) => {
  const viewer = event.api.addPanel({
    id: "viewer",
    title: "Viewer",
    component: "viewer",
  });
  const projectPanel = event.api.addPanel({
    id: "projectPanel",
    title: "Project",
    component: "projectPanel",
    tabComponent: "nonClosableTab",
    initialWidth: 600,
    position: {
      referencePanel: viewer,
      direction: "right",
    },
  });
  event.api.addPanel({
    id: "imageCollectionPanel",
    title: "Images",
    component: "imageCollectionPanel",
    tabComponent: "nonClosableTab",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "labelsCollectionPanel",
    title: "Labels",
    component: "labelsCollectionPanel",
    tabComponent: "nonClosableTab",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "pointsCollectionPanel",
    title: "Points",
    component: "pointsCollectionPanel",
    tabComponent: "nonClosableTab",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "shapesCollectionPanel",
    title: "Shapes",
    component: "shapesCollectionPanel",
    tabComponent: "nonClosableTab",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "tableCollectionPanel",
    title: "Tables",
    component: "tableCollectionPanel",
    tabComponent: "nonClosableTab",
    position: { referenceGroup: projectPanel.group },
  });
  viewer.group.header.hidden = true;
  viewer.group.locked = true;
  projectPanel.api.setActive();
};

const projectUrlParam = "project";
const defaultProjectUrl = "project.json";

export function App() {
  const adapter = useTissUUmaps(
    useShallow((state) => ({
      projectDir: state.projectDir,
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
      loadImage: state.loadImage,
      loadLabels: state.loadLabels,
      loadPoints: state.loadPoints,
      loadShapes: state.loadShapes,
      loadTable: state.loadTable,
      // rerender upon changes to data loader factories
      _imageDataLoaderFactories: state.imageDataLoaderFactories,
      _labelsDataLoaderFactories: state.labelsDataLoaderFactories,
      _pointsDataLoaderFactories: state.pointsDataLoaderFactories,
      _shapesDataLoaderFactories: state.shapesDataLoaderFactories,
      _tableDataLoaderFactories: state.tableDataLoaderFactories,
    })),
  );

  const clearProject = useTissUUmaps((state) => state.clearProject);
  const loadProjectFromURL = useTissUUmaps((state) => state.loadProjectFromURL);

  // make store available to plugins
  useEffect(() => {
    window.TissUUmaps = useTissUUmaps;
    return () => {
      delete window.TissUUmaps;
    };
  }, []);

  // load project, if available
  useEffect(() => {
    const abortController = new AbortController();
    const params = new URLSearchParams(window.location.search);
    const projectUrl = params.get(projectUrlParam) ?? defaultProjectUrl;
    loadProjectFromURL(projectUrl, {
      signal: abortController.signal,
      quiet: true,
    }).catch((reason) => {
      if (!abortController.signal.aborted) {
        console.error(reason);
      }
    });
    return () => {
      abortController.abort();
      clearProject();
    };
  }, [clearProject, loadProjectFromURL]);

  return (
    <div className="w-screen h-screen overflow-hidden">
      <ViewerProvider adapter={adapter}>
        <DockviewReact
          components={dockviewComponents}
          tabComponents={dockviewTabComponents}
          onReady={onDockviewReady}
        />
      </ViewerProvider>
    </div>
  );
}

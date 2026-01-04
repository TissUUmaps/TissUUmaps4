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
import { ImagesTab } from "./components/tabs/ImagesTab";
import { LabelsTab } from "./components/tabs/LabelsTab";
import { PointsTab } from "./components/tabs/PointsTab";
import { ProjectTab } from "./components/tabs/ProjectTab";
import { ShapesTab } from "./components/tabs/ShapesTab";
import { TablesTab } from "./components/tabs/TablesTab";
import { useTissUUmaps } from "./store";

declare global {
  interface Window {
    TissUUmaps?: typeof useTissUUmaps;
  }
}

const dockviewComponents = {
  viewer: () => <Viewer className="size-full bg-white" />,
  projectTab: () => <ProjectTab />,
  imagesTab: () => <ImagesTab />,
  labelsTab: () => <LabelsTab />,
  pointsTab: () => <PointsTab />,
  shapesTab: () => <ShapesTab />,
  tablesTab: () => <TablesTab />,
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
    id: "projectTab",
    title: "Project",
    component: "projectTab",
    tabComponent: "nonClosableTab",
    initialWidth: 600,
    position: {
      referencePanel: viewer,
      direction: "right",
    },
  });
  event.api.addPanel({
    id: "imagesTab",
    title: "Images",
    component: "imagesTab",
    tabComponent: "nonClosableTab",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "labelsTab",
    title: "Labels",
    component: "labelsTab",
    tabComponent: "nonClosableTab",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "pointsTab",
    title: "Points",
    component: "pointsTab",
    tabComponent: "nonClosableTab",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "shapesTab",
    title: "Shapes",
    component: "shapesTab",
    tabComponent: "nonClosableTab",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "tablesTab",
    title: "Tables",
    component: "tablesTab",
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

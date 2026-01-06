import {
  DockviewDefaultTab,
  DockviewReact,
  type DockviewReadyEvent,
  type IDockviewPanelHeaderProps,
  themeDark,
  themeLight,
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
  viewer: () => <Viewer className="size-full" />,
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
  persistentTab: (props: IDockviewPanelHeaderProps) => {
    return <DockviewDefaultTab hideClose={true} {...props} />;
  },
};

const onDockviewReady = (event: DockviewReadyEvent) => {
  const viewerPanel = event.api.addPanel({
    id: "viewer",
    title: "Viewer",
    component: "viewer",
  });
  viewerPanel.group.header.hidden = true;
  viewerPanel.group.locked = true;
  const projectPanel = event.api.addPanel({
    id: "projectTab",
    title: "Project",
    component: "projectTab",
    tabComponent: "persistentTab",
    initialWidth: 600,
    position: {
      referencePanel: viewerPanel,
      direction: "right",
    },
  });
  event.api.addPanel({
    id: "imagesTab",
    title: "Images",
    component: "imagesTab",
    tabComponent: "persistentTab",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "labelsTab",
    title: "Labels",
    component: "labelsTab",
    tabComponent: "persistentTab",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "pointsTab",
    title: "Points",
    component: "pointsTab",
    tabComponent: "persistentTab",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "shapesTab",
    title: "Shapes",
    component: "shapesTab",
    tabComponent: "persistentTab",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "tablesTab",
    title: "Tables",
    component: "tablesTab",
    tabComponent: "persistentTab",
    position: { referenceGroup: projectPanel.group },
  });
  projectPanel.api.setActive();
};

export function App() {
  const dark = useTissUUmaps((state) => state.dark);
  const clearProject = useTissUUmaps((state) => state.clearProject);
  const loadProjectFromURL = useTissUUmaps((state) => state.loadProjectFromURL);

  const viewerAdapter = useTissUUmaps(
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

  // plugins
  useEffect(() => {
    window.TissUUmaps = useTissUUmaps;
    return () => {
      delete window.TissUUmaps;
    };
  }, []);

  // load project
  useEffect(() => {
    const abortController = new AbortController();
    const params = new URLSearchParams(window.location.search);
    const projectUrl = params.get("project") ?? "project.json";
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
    // https://tailwindcss.com/docs/dark-mode
    <div className={`w-screen h-screen overflow-hidden ${dark ? "dark" : ""}`}>
      <ViewerProvider adapter={viewerAdapter}>
        <DockviewReact
          components={dockviewComponents}
          tabComponents={dockviewTabComponents}
          theme={dark ? themeDark : themeLight}
          onReady={onDockviewReady}
        />
      </ViewerProvider>
    </div>
  );
}

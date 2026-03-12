import { Button } from "@/components/ui/button";
import {
  DockviewDefaultTab,
  DockviewReact,
  type DockviewReadyEvent,
  type DockviewTheme,
  type IDockviewPanelHeaderProps,
} from "dockview-react";
import { Moon, Sun } from "lucide-react";
import { useShallow } from "zustand/shallow";

import { Viewer, ViewerProvider } from "@tissuumaps/viewer";

import "./App.css";
import { ImagesPanel } from "./components/panels/ImagesPanel";
import { LabelsPanel } from "./components/panels/LabelsPanel";
import { PointsPanel } from "./components/panels/PointsPanel";
import { ProjectPanel } from "./components/panels/ProjectPanel";
import { ShapesPanel } from "./components/panels/ShapesPanel";
import { TablesPanel } from "./components/panels/TablesPanel";
import { usePlugins } from "./hooks/usePlugins";
import { useProject } from "./hooks/useProject";
import { useTableDataProxy } from "./proxies/TableDataProxy";
import { useTissUUmaps } from "./store";

const dockviewTheme: DockviewTheme = {
  name: "tailwindcss",
  className: "dockview-theme-tailwindcss",
};

const dockviewComponents = {
  ViewerPanel: () => <Viewer className="size-full" />,
  ProjectPanel: () => <ProjectPanel className="m-2" />,
  ImagesPanel: () => <ImagesPanel className="m-2" />,
  LabelsPanel: () => <LabelsPanel className="m-2" />,
  PointsPanel: () => <PointsPanel className="m-2" />,
  ShapesPanel: () => <ShapesPanel className="m-2" />,
  TablesPanel: () => <TablesPanel className="m-2" />,
};

const dockviewTabComponents = {
  ClosablePanelHeader: (props: IDockviewPanelHeaderProps) => {
    return <DockviewDefaultTab hideClose={false} {...props} />;
  },
  PersistentPanelHeader: (props: IDockviewPanelHeaderProps) => {
    return <DockviewDefaultTab hideClose={true} {...props} />;
  },
};

function DockviewRightHeaderActionsComponent() {
  const dark = useTissUUmaps((state) => state.dark);
  const setDark = useTissUUmaps((state) => state.setDark);
  return (
    <Button onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}</Button>
  );
}

const onDockviewReady = (event: DockviewReadyEvent) => {
  const viewerPanel = event.api.addPanel({
    id: "viewerPanel",
    title: "Viewer",
    component: "ViewerPanel",
  });
  viewerPanel.group.header.hidden = true;
  viewerPanel.group.locked = true;
  const projectPanel = event.api.addPanel({
    id: "projectPanel",
    title: "Project",
    component: "ProjectPanel",
    tabComponent: "PersistentPanelHeader",
    initialWidth: 400,
    position: {
      referencePanel: viewerPanel,
      direction: "right",
    },
  });
  event.api.addPanel({
    id: "imagesPanel",
    title: "Images",
    component: "ImagesPanel",
    tabComponent: "PersistentPanelHeader",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "labelsPanel",
    title: "Labels",
    component: "LabelsPanel",
    tabComponent: "PersistentPanelHeader",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "pointsPanel",
    title: "Points",
    component: "PointsPanel",
    tabComponent: "PersistentPanelHeader",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "shapesPanel",
    title: "Shapes",
    component: "ShapesPanel",
    tabComponent: "PersistentPanelHeader",
    position: { referenceGroup: projectPanel.group },
  });
  event.api.addPanel({
    id: "tablesPanel",
    title: "Tables",
    component: "TablesPanel",
    tabComponent: "PersistentPanelHeader",
    position: { referenceGroup: projectPanel.group },
  });
  projectPanel.api.setActive();
};

export function App() {
  usePlugins();

  useProject("project", "project.json");

  const dark = useTissUUmaps((state) => state.dark);

  const viewerState = useTissUUmaps(
    useShallow((state) => ({
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
      loadImage: state.loadImage,
      loadLabels: state.loadLabels,
      loadPoints: state.loadPoints,
      loadShapes: state.loadShapes,
      // rerender upon changes to data loader factories
      _imageDataLoaderFactories: state.imageDataLoaderFactories,
      _labelsDataLoaderFactories: state.labelsDataLoaderFactories,
      _pointsDataLoaderFactories: state.pointsDataLoaderFactories,
      _shapesDataLoaderFactories: state.shapesDataLoaderFactories,
      _tableDataLoaderFactories: state.tableDataLoaderFactories,
    })),
  );

  const viewerActions = {
    loadTable: useTableDataProxy(),
  };

  const viewerAdapter = { ...viewerState, ...viewerActions };

  return (
    // https://tailwindcss.com/docs/dark-mode
    <div className={`w-screen h-screen overflow-hidden ${dark ? "dark" : ""}`}>
      <ViewerProvider adapter={viewerAdapter}>
        <DockviewReact
          theme={dockviewTheme}
          components={dockviewComponents}
          tabComponents={dockviewTabComponents}
          rightHeaderActionsComponent={DockviewRightHeaderActionsComponent}
          onReady={onDockviewReady}
        />
      </ViewerProvider>
    </div>
  );
}

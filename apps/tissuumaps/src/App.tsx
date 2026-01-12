import { Button } from "@/components/ui/button";
import {
  DockviewDefaultTab,
  DockviewReact,
  type DockviewReadyEvent,
  type IDockviewHeaderActionsProps,
  type IDockviewPanelHeaderProps,
  themeDark,
  themeLight,
} from "dockview-react";
import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useShallow } from "zustand/shallow";

import { Viewer, ViewerProvider } from "@tissuumaps/viewer";

import "./App.css";
import { ImagesPanel } from "./components/panels/ImagesPanel";
import { LabelsPanel } from "./components/panels/LabelsPanel";
import { PointsPanel } from "./components/panels/PointsPanel";
import { ProjectPanel } from "./components/panels/ProjectPanel";
import { ShapesPanel } from "./components/panels/ShapesPanel";
import { TablesPanel } from "./components/panels/TablesPanel";
import { useTissUUmaps } from "./store";

declare global {
  interface Window {
    TissUUmaps?: typeof useTissUUmaps;
  }
}

const projectPanelId = "projectPanel";

const dockviewComponents = {
  ViewerPanel: () => <Viewer className="size-full" />,
  ProjectPanel: () => <ProjectPanel className="m-2" />,
  ImagesPanel: () => <ImagesPanel className="m-2" />,
  LabelsPanel: () => <LabelsPanel />,
  PointsPanel: () => <PointsPanel className="m-2" />,
  ShapesPanel: () => <ShapesPanel />,
  TablesPanel: () => <TablesPanel />,
};

const dockviewTabComponents = {
  ClosablePanelHeader: (props: IDockviewPanelHeaderProps) => {
    return <DockviewDefaultTab hideClose={false} {...props} />;
  },
  PersistentPanelHeader: (props: IDockviewPanelHeaderProps) => {
    return <DockviewDefaultTab hideClose={true} {...props} />;
  },
};

const onDockviewReady = (event: DockviewReadyEvent) => {
  const viewerPanel = event.api.addPanel({
    id: "viewerPanel",
    title: "Viewer",
    component: "ViewerPanel",
  });
  viewerPanel.group.header.hidden = true;
  viewerPanel.group.locked = true;
  const projectPanel = event.api.addPanel({
    id: projectPanelId,
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
  const [toolbarElement, setToolbarElement] = useState<Element | null>(null);

  const dark = useTissUUmaps((state) => state.dark);
  const setDark = useTissUUmaps((state) => state.setDark);
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

  const DockviewToolbarHeaderActions = useCallback(
    (props: IDockviewHeaderActionsProps) => {
      if (props.group.panels.find((panel) => panel.id === projectPanelId)) {
        // Dockview does not re-render group headers upon state changes
        // --> we use a portal to render a React component that does
        return <div ref={setToolbarElement} />;
      }
    },
    [setToolbarElement],
  );

  return (
    // https://tailwindcss.com/docs/dark-mode
    <div className={`w-screen h-screen overflow-hidden ${dark ? "dark" : ""}`}>
      <ViewerProvider adapter={viewerAdapter}>
        <DockviewReact
          components={dockviewComponents}
          tabComponents={dockviewTabComponents}
          rightHeaderActionsComponent={DockviewToolbarHeaderActions}
          theme={dark ? themeDark : themeLight}
          onReady={onDockviewReady}
        />
        {toolbarElement &&
          createPortal(
            <>
              <Button onClick={() => setDark(!dark)}>
                {dark ? <Sun /> : <Moon />}
              </Button>
            </>,
            toolbarElement,
          )}
      </ViewerProvider>
    </div>
  );
}

import {
  type DockviewApi,
  DockviewDefaultTab,
  DockviewReact,
  type DockviewReadyEvent,
  type DockviewTheme,
  type IDockviewPanelHeaderProps,
} from "dockview-react";
import { Moon, Sun } from "lucide-react";
import { useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";

import "./App.css";
import { NotificationCenter } from "./components/NotificationCenter";
import { ImagesPanel } from "./components/panels/ImagesPanel";
import { LabelsPanel } from "./components/panels/LabelsPanel";
import { PointsPanel } from "./components/panels/PointsPanel";
import { ProjectPanel } from "./components/panels/ProjectPanel";
import { ShapesPanel } from "./components/panels/ShapesPanel";
import { TablesPanel } from "./components/panels/TablesPanel";
import { ViewerPanel } from "./components/panels/ViewerPanel";
import {
  type DataObjectKind,
  requestFocusObject,
} from "./hooks/useFocusObject";
import { useSettingsStore } from "./stores/settings";

/** Maps a data object kind to its dockview panel ID */
const panelIdByKind: Record<DataObjectKind, string> = {
  image: "imagesPanel",
  labels: "labelsPanel",
  points: "pointsPanel",
  shapes: "shapesPanel",
  table: "tablesPanel",
};

/** The Tailwind CSS-styled dockview theme defined in `dockview.css` */
const dockviewTheme: DockviewTheme = {
  name: "tailwindcss",
  className: "dockview-theme-tailwindcss",
};

/** The panels that can be shown in the dockview layout, by component name */
const dockviewComponents = {
  ViewerPanel: () => <ViewerPanel className="size-full" />,
  ProjectPanel: () => <ProjectPanel className="m-2" />,
  ImagesPanel: () => <ImagesPanel className="m-2" />,
  LabelsPanel: () => <LabelsPanel className="m-2" />,
  PointsPanel: () => <PointsPanel className="m-2" />,
  ShapesPanel: () => <ShapesPanel className="m-2" />,
  TablesPanel: () => <TablesPanel className="m-2" />,
};

/**
 * The tab headers available to panels, by component name: one that lets the
 * user close the panel, and one for panels that are always shown
 */
const dockviewTabComponents = {
  ClosablePanelHeader: (props: IDockviewPanelHeaderProps) => {
    return <DockviewDefaultTab hideClose={false} {...props} />;
  },
  PersistentPanelHeader: (props: IDockviewPanelHeaderProps) => {
    return <DockviewDefaultTab hideClose={true} {...props} />;
  },
};

/**
 * The dark mode toggle shown at the right end of the dockview tab bar
 */
function DockviewRightHeaderActionsComponent() {
  const dark = useSettingsStore((state) => state.dark);
  const setDark = useSettingsStore((state) => state.setDark);
  return (
    <Button onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}</Button>
  );
}

/**
 * Creates the application's initial panel layout
 *
 * The viewer panel fills the window; its group is locked and its header hidden,
 * so that it cannot be closed or moved. All other panels share a group to its
 * right, with the project panel active.
 *
 * @param event - The event carrying the API of the ready dockview
 */
const setupDockview = (event: DockviewReadyEvent) => {
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

/**
 * The application's root component
 *
 * Renders the dockview layout, and applies Tailwind CSS's `dark` class
 * according to the settings store.
 */
export function App() {
  const dark = useSettingsStore((state) => state.dark);

  const dockviewApiRef = useRef<DockviewApi | null>(null);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    dockviewApiRef.current = event.api;
    setupDockview(event);
  }, []);

  const openObject = useCallback((kind: DataObjectKind, objectId: string) => {
    dockviewApiRef.current?.getPanel(panelIdByKind[kind])?.api.setActive();
    requestFocusObject(kind, objectId);
  }, []);

  return (
    // https://tailwindcss.com/docs/dark-mode
    <div className={`w-screen h-screen overflow-hidden ${dark ? "dark" : ""}`}>
      <DockviewReact
        theme={dockviewTheme}
        components={dockviewComponents}
        tabComponents={dockviewTabComponents}
        rightHeaderActionsComponent={DockviewRightHeaderActionsComponent}
        onReady={onReady}
      />
      <NotificationCenter onOpenObject={openObject} />
    </div>
  );
}

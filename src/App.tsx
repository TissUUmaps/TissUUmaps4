import {
  DockviewDefaultTab,
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelHeaderProps,
} from "dockview-react";
import { useEffect } from "react";

import "./App.css";
import ImageCollectionPanel from "./components/ImageCollectionPanel";
import LabelsCollectionPanel from "./components/LabelsCollectionPanel";
import PointsCollectionPanel from "./components/PointsCollectionPanel";
import ProjectPanel from "./components/ProjectPanel";
import ShapesCollectionPanel from "./components/ShapesCollectionPanel";
import TableCollectionPanel from "./components/TableCollectionPanel";
import Viewer from "./components/Viewer";
import { useBoundStore } from "./store/boundStore";

declare global {
  interface Window {
    tissuumaps?: typeof useBoundStore;
  }
}

const dockviewComponents = {
  viewer: () => <Viewer />,
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

const PROJECT_URL_PARAM = "project";
const DEFAULT_PROJECT_URL = "project.json";

export default function App() {
  const clearProject = useBoundStore((state) => state.clearProject);
  const loadProjectFromURL = useBoundStore((state) => state.loadProjectFromURL);

  // make store available to plugins
  useEffect(() => {
    window.tissuumaps = useBoundStore;
    return () => {
      delete window.tissuumaps;
    };
  }, []);

  // load project, if available
  useEffect(() => {
    const abortController = new AbortController();
    const params = new URLSearchParams(window.location.search);
    const projectUrl = params.get(PROJECT_URL_PARAM) ?? DEFAULT_PROJECT_URL;
    loadProjectFromURL(projectUrl, {
      signal: abortController.signal,
      quiet: true,
    }).catch((reason) => {
      if (!abortController.signal.aborted) {
        console.error(reason);
      }
    });
    return () => {
      abortController.abort("app cleanup");
      clearProject();
    };
  }, [clearProject, loadProjectFromURL]);

  return (
    <div className="w-screen h-screen overflow-hidden">
      <DockviewReact
        components={dockviewComponents}
        tabComponents={dockviewTabComponents}
        onReady={onDockviewReady}
      />
    </div>
  );
}

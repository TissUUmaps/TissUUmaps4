import {
  DockviewDefaultTab,
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelHeaderProps,
} from "dockview-react";
import { useEffect } from "react";

import "./App.css";
import ProjectPanel from "./components/ProjectPanel";
import ViewerPanel from "./components/ViewerPanel";
import ImageCollectionPanel from "./components/images/ImageCollectionPanel";
import LabelsCollectionPanel from "./components/labels/LabelsCollectionPanel";
import PointsCollectionPanel from "./components/points/PointsCollectionPanel";
import ShapesCollectionPanel from "./components/shapes/ShapesCollectionPanel";
import TableCollectionPanel from "./components/tables/TableCollectionPanel";
import { useBoundStore } from "./stores/boundStore";

declare global {
  interface Window {
    tissuumaps?: typeof useBoundStore;
  }
}

export default function App() {
  // make the store available to plugins
  useEffect(() => {
    window.tissuumaps = useBoundStore;
    return () => {
      delete window.tissuumaps;
    };
  }, []);

  const dockviewComponents = {
    viewerPanel: () => <ViewerPanel />,
    projectPanel: () => <ProjectPanel />,
    imageCollectionPanel: () => <ImageCollectionPanel />,
    labelsCollectionPanel: () => <LabelsCollectionPanel />,
    pointsCollectionPanel: () => <PointsCollectionPanel />,
    shapesCollectionPanel: () => <ShapesCollectionPanel />,
    tableCollectionPanel: () => <TableCollectionPanel />,
  };

  const NonClosableDockviewDefaultTab = (props: IDockviewPanelHeaderProps) => {
    return <DockviewDefaultTab hideClose={true} {...props} />;
  };

  function onDockviewReady(event: DockviewReadyEvent) {
    const viewerPanel = event.api.addPanel({
      id: "viewerPanel",
      title: "Viewer",
      component: "viewerPanel",
    });
    const projectPanel = event.api.addPanel({
      id: "projectPanel",
      title: "Project",
      component: "projectPanel",
      initialWidth: 600,
      position: {
        referencePanel: viewerPanel,
        direction: "right",
      },
    });
    event.api.addPanel({
      id: "imageCollectionPanel",
      title: "Images",
      component: "imageCollectionPanel",
      position: { referenceGroup: projectPanel.group },
    });
    event.api.addPanel({
      id: "labelsCollectionPanel",
      title: "Labels",
      component: "labelsCollectionPanel",
      position: { referenceGroup: projectPanel.group },
    });
    event.api.addPanel({
      id: "pointsCollectionPanel",
      title: "Points",
      component: "pointsCollectionPanel",
      position: { referenceGroup: projectPanel.group },
    });
    event.api.addPanel({
      id: "shapesCollectionPanel",
      title: "Shapes",
      component: "shapesCollectionPanel",
      position: { referenceGroup: projectPanel.group },
    });
    event.api.addPanel({
      id: "tableCollectionPanel",
      title: "Tables",
      component: "tableCollectionPanel",
      position: { referenceGroup: projectPanel.group },
    });
    viewerPanel.group.header.hidden = true;
    viewerPanel.group.locked = true;
    projectPanel.api.setActive();
  }

  return (
    <div className="w-screen h-screen overflow-hidden">
      <DockviewReact
        components={dockviewComponents}
        defaultTabComponent={NonClosableDockviewDefaultTab}
        onReady={onDockviewReady}
      />
    </div>
  );
}

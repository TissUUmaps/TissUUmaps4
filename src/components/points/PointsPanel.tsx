import { useState } from "react";
import { Button, Collapse, Tab, Tabs } from "react-bootstrap";

import Points from "../../model/points";
import useProjectStore from "../../stores/projectStore";
import PointsGroupsPanel from "./PointsGroupsPanel";
import PointsQuicksetPanel from "./PointsQuicksetPanel";
import PointsSettingsPanel from "./PointsSettingsPanel";

interface PointsPanelItemProps {
  pointsKey: string;
  points: Points;
}

function PointsPanelItem({ pointsKey, points }: PointsPanelItemProps) {
  const [quicksetPanelOpen, setQuicksetPanelOpen] = useState(true);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const [groupsPanelOpen, setGroupsPanelOpen] = useState(true);
  return (
    <div>
      <div>
        <Button onClick={() => setQuicksetPanelOpen(!quicksetPanelOpen)}>
          Quickset
        </Button>
        <Collapse in={quicksetPanelOpen}>
          <PointsQuicksetPanel pointsKey={pointsKey} points={points} />
        </Collapse>
      </div>
      <div>
        <Button onClick={() => setSettingsPanelOpen(!settingsPanelOpen)}>
          Settings
        </Button>
        <Collapse in={settingsPanelOpen}>
          <PointsSettingsPanel pointsKey={pointsKey} points={points} />
        </Collapse>
      </div>
      <div>
        <Button onClick={() => setGroupsPanelOpen(!groupsPanelOpen)}>
          Groups
        </Button>
        <Collapse in={groupsPanelOpen}>
          <PointsGroupsPanel pointsKey={pointsKey} points={points} />
        </Collapse>
      </div>
    </div>
  );
}

export default function PointsPanel() {
  const allPoints = useProjectStore((state) => state.allPoints);
  return (
    <Tabs>
      {[...allPoints].map(([pointsKey, points]) => (
        <Tab key={pointsKey} title={points.name}>
          <PointsPanelItem pointsKey={pointsKey} points={points} />
        </Tab>
      ))}
    </Tabs>
  );
}

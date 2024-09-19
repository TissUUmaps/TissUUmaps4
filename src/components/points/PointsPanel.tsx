import { useState } from "react";
import { Button, Collapse, Tab, Tabs } from "react-bootstrap";

import Points from "../../model/points";
import useSharedStore from "../../store/sharedStore";
import PointsGroupsPanel from "./PointsGroupsPanel";
import PointsQuicksetPanel from "./PointsQuicksetPanel";
import PointsSettingsPanel from "./PointsSettingsPanel";

interface PointsPanelItemProps {
  pointsId: string;
  points: Points;
}

function PointsPanelItem({ pointsId, points }: PointsPanelItemProps) {
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
          <PointsQuicksetPanel pointsId={pointsId} points={points} />
        </Collapse>
      </div>
      <div>
        <Button onClick={() => setSettingsPanelOpen(!settingsPanelOpen)}>
          Settings
        </Button>
        <Collapse in={settingsPanelOpen}>
          <PointsSettingsPanel pointsId={pointsId} points={points} />
        </Collapse>
      </div>
      <div>
        <Button onClick={() => setGroupsPanelOpen(!groupsPanelOpen)}>
          Groups
        </Button>
        <Collapse in={groupsPanelOpen}>
          <PointsGroupsPanel pointsId={pointsId} points={points} />
        </Collapse>
      </div>
    </div>
  );
}

export default function PointsPanel() {
  const allPoints = useSharedStore((state) => state.allPoints);
  return (
    <Tabs>
      {[...allPoints].map(([pointsId, points]) => (
        <Tab key={pointsId} title={points.name}>
          <PointsPanelItem pointsId={pointsId} points={points} />
        </Tab>
      ))}
    </Tabs>
  );
}

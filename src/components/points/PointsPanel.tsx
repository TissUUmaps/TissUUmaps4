import { useState } from "react";
import { Button, Collapse } from "react-bootstrap";

import { PointsModel } from "../../models/points";
import PointsGroupSettingsPanel from "./PointsGroupSettingsPanel";
import PointsLayerConfigsPanel from "./PointsLayerConfigsPanel";

interface PointsPanelProps {
  pointsId: string;
  points: PointsModel;
}

export default function PointsPanel({ pointsId, points }: PointsPanelProps) {
  const [layerConfigsPanelOpen, setLayerConfigsPanelOpen] = useState(true);
  const [groupSettingsPanelOpen, setGroupSettingsPanelOpen] = useState(true);
  return (
    <div>
      <div>
        <Button
          onClick={() => setLayerConfigsPanelOpen(!layerConfigsPanelOpen)}
        >
          Settings
        </Button>
        <Collapse in={layerConfigsPanelOpen}>
          <PointsLayerConfigsPanel pointsId={pointsId} points={points} />
        </Collapse>
      </div>
      <div>
        <Button
          onClick={() => setGroupSettingsPanelOpen(!groupSettingsPanelOpen)}
        >
          Groups
        </Button>
        <Collapse in={groupSettingsPanelOpen}>
          <PointsGroupSettingsPanel pointsId={pointsId} points={points} />
        </Collapse>
      </div>
    </div>
  );
}

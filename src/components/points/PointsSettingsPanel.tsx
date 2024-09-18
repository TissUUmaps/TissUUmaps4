import { Form } from "react-bootstrap";

import Points, {
  isPointGroupsVariable,
  isPointValuesVariable,
} from "../../model/points";
import useProjectStore from "../../stores/projectStore";

interface PointsSettingsPanelProps {
  pointsKey: string;
  points: Points;
}

export default function PointsSettingsPanel({
  pointsKey,
  points,
}: PointsSettingsPanelProps) {
  const activeProfile = points.settings.profiles.get(
    points.settings.activeProfileKey,
  )!;
  const setActiveProfile = useProjectStore(
    (state) => state.setActivePointsSettingsProfile,
  );
  return (
    <div>
      <Form.Select
        value={points.settings.activeProfileKey}
        onChange={(e) => setActiveProfile(pointsKey, e.target.value)}
      >
        {[...points.settings.profiles].map(([profileKey, profile]) => (
          <option key={profileKey} value={profileKey}>
            {profile.name}
          </option>
        ))}
      </Form.Select>
      <div>
        <legend>Size</legend>
        <input
          id="sizeValue"
          type="radio"
          checked={
            !isPointValuesVariable(activeProfile.size) &&
            !isPointGroupsVariable(activeProfile.size)
          }
        />
        <label htmlFor="sizeValue">Value:</label>
        <input type="number" value={activeProfile.size as number} readOnly />
        <input
          id="sizeValuesVariable"
          type="radio"
          checked={isPointValuesVariable(activeProfile.size)}
          readOnly
        />
        <label htmlFor="sizeValuesVariable">From data:</label>
        {/* FIXME */}
        <input
          id="sizeGroupsVariable"
          type="radio"
          checked={isPointGroupsVariable(activeProfile.size)}
          readOnly
        />
        <label htmlFor="sizeGroupsVariable">By group:</label>
        {/* FIXME */}
      </div>
    </div>
  );
}

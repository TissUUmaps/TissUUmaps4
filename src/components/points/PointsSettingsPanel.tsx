import { Form } from "react-bootstrap";

import Points, {
  isPointGroupsVariable,
  isPointValuesVariable,
} from "../../model/points";
import useSharedStore from "../../store/sharedStore";

interface PointsSettingsPanelProps {
  pointsId: string;
  points: Points;
}

export default function PointsSettingsPanel({
  pointsId,
  points,
}: PointsSettingsPanelProps) {
  const activeProfile = points.settings.profiles.get(
    points.settings.activeProfileId,
  );
  const setActiveProfile = useSharedStore(
    (state) => state.setActivePointsSettingsProfile,
  );
  return (
    <div>
      <Form.Select
        value={points.settings.activeProfileId}
        onChange={(e) => setActiveProfile(pointsId, e.target.value)}
      >
        {[...points.settings.profiles].map(([profileId, profile]) => (
          <option key={profileId} value={profileId}>
            {profile.name}
          </option>
        ))}
      </Form.Select>
      {activeProfile && (
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
      )}
    </div>
  );
}

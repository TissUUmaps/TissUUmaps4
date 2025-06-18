import { IPointsModel } from "../../models/points";
import PointsGroupSettingsPanel from "./PointsGroupSettingsPanel";
import PointsSettingsPanel from "./PointsSettingsPanel";

type PointsPanelProps = {
  pointsId: string;
  points: IPointsModel;
};

export default function PointsPanel(props: PointsPanelProps) {
  return (
    <>
      <PointsSettingsPanel pointsId={props.pointsId} points={props.points} />
      <PointsGroupSettingsPanel
        pointsId={props.pointsId}
        points={props.points}
      />
    </>
  );
}

import { ILabelsModel } from "../../models/labels";
import LabelsGroupSettingsPanel from "./LabelsGroupSettingsPanel";
import LabelsSettingsPanel from "./LabelsSettingsPanel";

type LabelsPanelProps = {
  labelsId: string;
  labels: ILabelsModel;
};

export default function LabelsPanel(props: LabelsPanelProps) {
  return (
    <>
      <LabelsSettingsPanel labelsId={props.labelsId} labels={props.labels} />
      <LabelsGroupSettingsPanel
        labelsId={props.labelsId}
        labels={props.labels}
      />
    </>
  );
}

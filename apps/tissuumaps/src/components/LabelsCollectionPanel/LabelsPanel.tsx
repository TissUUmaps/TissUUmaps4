import { type Labels } from "@tissuumaps/core";

import { LabelsGroupSettingsPanel } from "./LabelsGroupSettingsPanel";
import { LabelsSettingsPanel } from "./LabelsSettingsPanel";

type LabelsPanelProps = {
  labelsId: string;
  labels: Labels;
};

export function LabelsPanel(props: LabelsPanelProps) {
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

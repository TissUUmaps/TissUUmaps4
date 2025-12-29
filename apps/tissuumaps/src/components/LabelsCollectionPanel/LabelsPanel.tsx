import { type Labels } from "@tissuumaps/core";

import { LabelsSettingsPanel } from "./LabelsSettingsPanel";

type LabelsPanelProps = {
  labels: Labels;
};

export function LabelsPanel(props: LabelsPanelProps) {
  return (
    <>
      <LabelsSettingsPanel labels={props.labels} />
    </>
  );
}

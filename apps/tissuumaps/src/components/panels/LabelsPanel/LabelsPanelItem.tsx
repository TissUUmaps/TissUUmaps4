import { type Labels } from "@tissuumaps/core";

import { LabelsPanelItemSettings } from "./LabelsPanelItemSettings";

export type LabelsPanelItemProps = {
  labels: Labels;
};

export function LabelsPanelItem({ labels }: LabelsPanelItemProps) {
  return (
    <>
      <LabelsPanelItemSettings labels={labels} />
    </>
  );
}

import { type Labels } from "@tissuumaps/core";

import { LabelsPanelItemSettings } from "./LabelsPanelItemSettings";

export function LabelsPanelItem({ labels }: { labels: Labels }) {
  return (
    <>
      <LabelsPanelItemSettings labels={labels} />
    </>
  );
}

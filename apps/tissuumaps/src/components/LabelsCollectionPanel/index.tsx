import { useTissUUmaps } from "../../store";
import { LabelsPanel } from "./LabelsPanel";

export function LabelsCollectionPanel() {
  const labels = useTissUUmaps((state) => state.labels);
  return (
    <>
      {labels.map((currentLabels) => (
        <LabelsPanel key={currentLabels.id} labels={currentLabels} />
      ))}
    </>
  );
}

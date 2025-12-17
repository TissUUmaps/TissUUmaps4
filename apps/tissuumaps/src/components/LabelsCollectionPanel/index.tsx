import { useTissUUmaps } from "../../store";
import { MapUtils } from "../../utils";
import { LabelsPanel } from "./LabelsPanel";

export function LabelsCollectionPanel() {
  const labelsMap = useTissUUmaps((state) => state.labelsMap);
  return (
    <>
      {labelsMap &&
        MapUtils.map(labelsMap, (labelsId, labels) => (
          <LabelsPanel key={labelsId} labelsId={labelsId} labels={labels} />
        ))}
    </>
  );
}

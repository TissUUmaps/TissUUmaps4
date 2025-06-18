import { useBoundStore } from "../../stores/boundStore";
import MapUtils from "../../utils/MapUtils";
import LabelsPanel from "./LabelsPanel";

export default function LabelsCollectionPanel() {
  const labels = useBoundStore((state) => state.labels);
  return (
    <>
      {labels &&
        MapUtils.map(labels, (labelsId, labels) => (
          <LabelsPanel key={labelsId} labelsId={labelsId} labels={labels} />
        ))}
    </>
  );
}

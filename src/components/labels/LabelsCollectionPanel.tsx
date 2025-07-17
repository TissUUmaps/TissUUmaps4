import { useBoundStore } from "../../stores/boundStore";
import MapUtils from "../../utils/MapUtils";
import LabelsPanel from "./LabelsPanel";

export default function LabelsCollectionPanel() {
  const labelsMap = useBoundStore((state) => state.labelsMap);
  return (
    <>
      {labelsMap &&
        MapUtils.map(labelsMap, (labelsId, labels) => (
          <LabelsPanel key={labelsId} labelsId={labelsId} labels={labels} />
        ))}
    </>
  );
}

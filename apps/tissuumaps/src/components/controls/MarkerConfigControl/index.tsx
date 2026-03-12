import { ConstantMarkerConfigControl } from "./ConstantMarkerConfigControl";
import { FromMarkerConfigControl } from "./FromMarkerConfigControl";
import { GroupByMarkerConfigControl } from "./GroupByMarkerConfigControl";
import { type MarkerConfigControlState } from "./useMarkerConfigControl";

export { ActiveMarkerConfigValue } from "./ActiveMarkerConfigValue";
export { MarkerConfigSourceToggleGroup } from "./MarkerConfigSourceToggleGroup";

export type MarkerConfigControlProps = {
  state: MarkerConfigControlState;
  className?: string;
};

export function MarkerConfigControl({
  state,
  className,
}: MarkerConfigControlProps) {
  switch (state.currentSource) {
    case "constant":
      return (
        <ConstantMarkerConfigControl state={state} className={className} />
      );
    case "from":
      return <FromMarkerConfigControl state={state} className={className} />;
    case "groupBy":
      return <GroupByMarkerConfigControl state={state} className={className} />;
  }
}

import { ConstantMarkerConfigWidget } from "./ConstantMarkerConfigWidget";
import { FromMarkerConfigWidget } from "./FromMarkerConfigWidget";
import { GroupByMarkerConfigWidget } from "./GroupByMarkerConfigWidget";
import { type MarkerConfigWidgetState } from "./useMarkerConfigWidget";

export { ActiveMarkerConfigValue } from "./ActiveMarkerConfigValue";
export { MarkerConfigSourceToggleGroup } from "./MarkerConfigSourceToggleGroup";

export type MarkerConfigWidgetProps = {
  state: MarkerConfigWidgetState;
  className?: string;
};

export function MarkerConfigWidget({
  state,
  className,
}: MarkerConfigWidgetProps) {
  switch (state.currentSource) {
    case "constant":
      return <ConstantMarkerConfigWidget state={state} className={className} />;
    case "from":
      return <FromMarkerConfigWidget state={state} className={className} />;
    case "groupBy":
      return <GroupByMarkerConfigWidget state={state} className={className} />;
  }
}

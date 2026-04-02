import { ConstantSizeConfigWidget } from "./ConstantSizeConfigWidget";
import { FromSizeConfigWidget } from "./FromSizeConfigWidget";
import { GroupBySizeConfigWidget } from "./GroupBySizeConfigWidget";
import { type SizeConfigWidgetState } from "./useSizeConfigWidget";

export { ActiveSizeConfigValue } from "./ActiveSizeConfigValue";
export { SizeConfigSourceToggleGroup } from "./SizeConfigSourceToggleGroup";

export type SizeConfigWidgetProps = {
  state: SizeConfigWidgetState;
  className?: string;
};

export function SizeConfigWidget({ state, className }: SizeConfigWidgetProps) {
  switch (state.currentSource) {
    case "constant":
      return <ConstantSizeConfigWidget state={state} className={className} />;
    case "from":
      return <FromSizeConfigWidget state={state} className={className} />;
    case "groupBy":
      return <GroupBySizeConfigWidget state={state} className={className} />;
  }
}

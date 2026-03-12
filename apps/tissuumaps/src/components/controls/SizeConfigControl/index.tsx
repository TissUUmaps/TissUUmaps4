import { ConstantSizeConfigControl } from "./ConstantSizeConfigControl";
import { FromSizeConfigControl } from "./FromSizeConfigControl";
import { GroupBySizeConfigControl } from "./GroupBySizeConfigControl";
import { type SizeConfigControlState } from "./useSizeConfigControl";

export { ActiveSizeConfigValue } from "./ActiveSizeConfigValue";
export { SizeConfigSourceToggleGroup } from "./SizeConfigSourceToggleGroup";

export type SizeConfigControlProps = {
  state: SizeConfigControlState;
  className?: string;
};

export function SizeConfigControl({
  state,
  className,
}: SizeConfigControlProps) {
  switch (state.currentSource) {
    case "constant":
      return <ConstantSizeConfigControl state={state} className={className} />;
    case "from":
      return <FromSizeConfigControl state={state} className={className} />;
    case "groupBy":
      return <GroupBySizeConfigControl state={state} className={className} />;
  }
}

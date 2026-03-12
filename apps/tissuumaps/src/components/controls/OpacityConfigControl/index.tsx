import { ConstantOpacityConfigControl } from "./ConstantOpacityConfigControl";
import { FromOpacityConfigControl } from "./FromOpacityConfigControl";
import { GroupByOpacityConfigControl } from "./GroupByOpacityConfigControl";
import { type OpacityConfigControlState } from "./useOpacityConfigControl";

export { ActiveOpacityConfigValue } from "./ActiveOpacityConfigValue";
export { OpacityConfigSourceToggleGroup } from "./OpacityConfigSourceToggleGroup";

export type OpacityConfigControlProps = {
  state: OpacityConfigControlState;
  className?: string;
};

export function OpacityConfigControl({
  state,
  className,
}: OpacityConfigControlProps) {
  switch (state.currentSource) {
    case "constant":
      return (
        <ConstantOpacityConfigControl state={state} className={className} />
      );
    case "from":
      return <FromOpacityConfigControl state={state} className={className} />;
    case "groupBy":
      return (
        <GroupByOpacityConfigControl state={state} className={className} />
      );
  }
}

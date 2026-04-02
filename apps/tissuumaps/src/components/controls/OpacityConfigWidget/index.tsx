import { ConstantOpacityConfigWidget } from "./ConstantOpacityConfigWidget";
import { FromOpacityConfigWidget } from "./FromOpacityConfigWidget";
import { GroupByOpacityConfigWidget } from "./GroupByOpacityConfigWidget";
import { type OpacityConfigWidgetState } from "./useOpacityConfigWidget";

export { ActiveOpacityConfigValue } from "./ActiveOpacityConfigValue";
export { OpacityConfigSourceToggleGroup } from "./OpacityConfigSourceToggleGroup";

export type OpacityConfigWidgetProps = {
  state: OpacityConfigWidgetState;
  className?: string;
};

export function OpacityConfigWidget({
  state,
  className,
}: OpacityConfigWidgetProps) {
  switch (state.currentSource) {
    case "constant":
      return (
        <ConstantOpacityConfigWidget state={state} className={className} />
      );
    case "from":
      return <FromOpacityConfigWidget state={state} className={className} />;
    case "groupBy":
      return <GroupByOpacityConfigWidget state={state} className={className} />;
  }
}

import { ConstantVisibilityConfigWidget } from "./ConstantVisibilityConfigWidget";
import { FromVisibilityConfigWidget } from "./FromVisibilityConfigWidget";
import { GroupByVisibilityConfigWidget } from "./GroupByVisibilityConfigWidget";
import { type VisibilityConfigWidgetState } from "./useVisibilityConfigWidget";

export { ActiveVisibilityConfigValue } from "./ActiveVisibilityConfigValue";
export { VisibilityConfigSourceToggleGroup } from "./VisibilityConfigSourceToggleGroup";

export type VisibilityConfigWidgetProps = {
  state: VisibilityConfigWidgetState;
  className?: string;
};

export function VisibilityConfigWidget({
  state,
  className,
}: VisibilityConfigWidgetProps) {
  switch (state.currentSource) {
    case "constant":
      return (
        <ConstantVisibilityConfigWidget state={state} className={className} />
      );
    case "from":
      return <FromVisibilityConfigWidget state={state} className={className} />;
    case "groupBy":
      return (
        <GroupByVisibilityConfigWidget state={state} className={className} />
      );
  }
}

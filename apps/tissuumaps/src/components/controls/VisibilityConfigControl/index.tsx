import { ConstantVisibilityConfigControl } from "./ConstantVisibilityConfigControl";
import { FromVisibilityConfigControl } from "./FromVisibilityConfigControl";
import { GroupByVisibilityConfigControl } from "./GroupByVisibilityConfigControl";
import { type VisibilityConfigControlState } from "./useVisibilityConfigControl";

export { ActiveVisibilityConfigValue } from "./ActiveVisibilityConfigValue";
export { VisibilityConfigSourceToggleGroup } from "./VisibilityConfigSourceToggleGroup";

export type VisibilityConfigControlProps = {
  state: VisibilityConfigControlState;
  className?: string;
};

export function VisibilityConfigControl({
  state,
  className,
}: VisibilityConfigControlProps) {
  switch (state.currentSource) {
    case "constant":
      return (
        <ConstantVisibilityConfigControl state={state} className={className} />
      );
    case "from":
      return (
        <FromVisibilityConfigControl state={state} className={className} />
      );
    case "groupBy":
      return (
        <GroupByVisibilityConfigControl state={state} className={className} />
      );
  }
}

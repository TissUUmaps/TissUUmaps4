import { ConstantColorConfigWidget } from "./ConstantColorConfigWidget";
import { FromColorConfigWidget } from "./FromColorConfigWidget";
import { GroupByColorConfigWidget } from "./GroupByColorConfigWidget";
import { RandomColorConfigWidget } from "./RandomColorConfigWidget";
import { type ColorConfigWidgetState } from "./useColorConfigWidget";

export { ActiveColorConfigValue } from "./ActiveColorConfigValue";
export { ColorConfigSourceToggleGroup } from "./ColorConfigSourceToggleGroup";

export type ColorConfigWidgetProps = {
  state: ColorConfigWidgetState;
  className?: string;
};

export function ColorConfigWidget({
  state,
  className,
}: ColorConfigWidgetProps) {
  switch (state.currentSource) {
    case "constant":
      return <ConstantColorConfigWidget state={state} className={className} />;
    case "from":
      return <FromColorConfigWidget state={state} className={className} />;
    case "groupBy":
      return <GroupByColorConfigWidget state={state} className={className} />;
    case "random":
      return <RandomColorConfigWidget state={state} className={className} />;
  }
}

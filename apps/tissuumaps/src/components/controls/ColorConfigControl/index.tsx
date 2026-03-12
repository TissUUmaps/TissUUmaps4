import { ConstantColorConfigControl } from "./ConstantColorConfigControl";
import { FromColorConfigControl } from "./FromColorConfigControl";
import { GroupByColorConfigControl } from "./GroupByColorConfigControl";
import { RandomColorConfigControl } from "./RandomColorConfigControl";
import { type ColorConfigControlState } from "./useColorConfigControl";

export { ActiveColorConfigValue } from "./ActiveColorConfigValue";
export { ColorConfigSourceToggleGroup } from "./ColorConfigSourceToggleGroup";

export type ColorConfigControlProps = {
  state: ColorConfigControlState;
  className?: string;
};

export function ColorConfigControl({
  state,
  className,
}: ColorConfigControlProps) {
  switch (state.currentSource) {
    case "constant":
      return <ConstantColorConfigControl state={state} className={className} />;
    case "from":
      return <FromColorConfigControl state={state} className={className} />;
    case "groupBy":
      return <GroupByColorConfigControl state={state} className={className} />;
    case "random":
      return <RandomColorConfigControl state={state} className={className} />;
  }
}

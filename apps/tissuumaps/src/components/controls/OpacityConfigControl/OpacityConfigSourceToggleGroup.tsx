import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CircleDotIcon, CircleIcon } from "lucide-react";

import { useOpacityConfigContext } from "./context";

export type OpacityConfigSourceToggleGroupProps = Omit<
  Parameters<typeof ToggleGroup>[0],
  "value" | "onValueChange"
>;

export function OpacityConfigSourceToggleGroup(
  props: OpacityConfigSourceToggleGroupProps,
) {
  const { activeSource, currentSource, setCurrentSource } =
    useOpacityConfigContext();
  return (
    <ToggleGroup
      value={[currentSource]}
      onValueChange={(value) => {
        if (value.length === 1 && value[0] !== undefined) {
          setCurrentSource(value[0] as typeof currentSource);
        }
      }}
      {...props}
    >
      <ToggleGroupItem value={"constant" satisfies typeof currentSource}>
        {activeSource === "constant" ? (
          <CircleDotIcon className="text-green-500" />
        ) : (
          <CircleIcon className="text-gray-200" />
        )}
        constant
      </ToggleGroupItem>
      <ToggleGroupItem value={"from" satisfies typeof currentSource}>
        {activeSource === "from" ? (
          <CircleDotIcon className="text-green-500" />
        ) : (
          <CircleIcon className="text-gray-200" />
        )}
        from
      </ToggleGroupItem>
      <ToggleGroupItem value={"groupBy" satisfies typeof currentSource}>
        {activeSource === "groupBy" ? (
          <CircleDotIcon className="text-green-500" />
        ) : (
          <CircleIcon className="text-gray-200" />
        )}
        group by
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

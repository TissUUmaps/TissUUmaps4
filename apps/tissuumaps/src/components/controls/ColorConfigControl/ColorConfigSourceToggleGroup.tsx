import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { useColorConfigContext } from "./context";

export type ColorConfigSourceToggleGroupProps = Omit<
  Parameters<typeof ToggleGroup>[0],
  "value" | "onValueChange"
>;

export function ColorConfigSourceToggleGroup(
  props: ColorConfigSourceToggleGroupProps,
) {
  const { currentSource, setCurrentSource } = useColorConfigContext();
  return (
    <ToggleGroup
      value={[currentSource]}
      onValueChange={(value) =>
        setCurrentSource(value[0] as typeof currentSource)
      }
      {...props}
    >
      <ToggleGroupItem value={"constant" satisfies typeof currentSource}>
        constant
      </ToggleGroupItem>
      <ToggleGroupItem value={"from" satisfies typeof currentSource}>
        from
      </ToggleGroupItem>
      <ToggleGroupItem value={"groupBy" satisfies typeof currentSource}>
        groupBy
      </ToggleGroupItem>
      <ToggleGroupItem value={"random" satisfies typeof currentSource}>
        random
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

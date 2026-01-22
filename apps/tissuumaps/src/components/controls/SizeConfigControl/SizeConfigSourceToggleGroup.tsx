import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { useSizeConfigContext } from "./context";

export type SizeConfigSourceToggleGroupProps = Omit<
  Parameters<typeof ToggleGroup>[0],
  "value" | "onValueChange"
>;

export function SizeConfigSourceToggleGroup(
  props: SizeConfigSourceToggleGroupProps,
) {
  const { currentSource, setCurrentSource } = useSizeConfigContext();
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
    </ToggleGroup>
  );
}

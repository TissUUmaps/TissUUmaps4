import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
      <ToggleGroupItem
        value={"constant" satisfies typeof currentSource}
        className={activeSource === "constant" ? "font-medium" : "font-normal"}
      >
        constant
      </ToggleGroupItem>
      <ToggleGroupItem
        value={"from" satisfies typeof currentSource}
        className={activeSource === "from" ? "font-medium" : "font-normal"}
      >
        from
      </ToggleGroupItem>
      <ToggleGroupItem
        value={"groupBy" satisfies typeof currentSource}
        className={activeSource === "groupBy" ? "font-medium" : "font-normal"}
      >
        group by
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

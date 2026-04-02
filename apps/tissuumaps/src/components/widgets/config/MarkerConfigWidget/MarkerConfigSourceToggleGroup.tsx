import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { type MarkerConfigWidgetState } from "./useMarkerConfigWidget";

export type MarkerConfigSourceToggleGroupProps = Omit<
  Parameters<typeof ToggleGroup>[0],
  "value" | "onValueChange"
> & {
  state: MarkerConfigWidgetState;
};

export function MarkerConfigSourceToggleGroup({
  state,
  ...props
}: MarkerConfigSourceToggleGroupProps) {
  const { activeSource, currentSource, setCurrentSource } = state;

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

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { useColorConfigContext } from "./context";

export function ColorConfigSourceToggleGroup({
  className,
}: {
  className?: string;
}) {
  const { currentSource, setCurrentSource } = useColorConfigContext();
  return (
    <ToggleGroup
      value={[currentSource]}
      onValueChange={(value) =>
        setCurrentSource(value[0] as typeof currentSource)
      }
      className={className}
    >
      <ToggleGroupItem value={"value" satisfies typeof currentSource}>
        value
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

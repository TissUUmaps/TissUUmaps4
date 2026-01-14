import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChevronRightIcon } from "lucide-react";
import { type MouseEvent, useState } from "react";

import {
  type Points,
  isGroupByConfig,
  isRandomConfig,
  isValueConfig,
} from "@tissuumaps/core";

const Setting = {
  Color: "color",
} as const;

export function PointsPanelItemSettings({ points }: { points: Points }) {
  const [activeSetting, setActiveSetting] = useState<
    (typeof Setting)[keyof typeof Setting] | null
  >(null);

  let colorMode: "Color" | "TableValuesRef" | "TableGroupsRef" | "Random";
  if (isValueConfig(points.pointColor)) {
    colorMode = "TableValuesRef";
  } else if (isGroupByConfig(points.pointColor)) {
    colorMode = "TableGroupsRef";
  } else if (isRandomConfig(points.pointColor)) {
    colorMode = "Random";
  } else {
    colorMode = "Color";
  }

  const handleColorToggleItemClick = (e: MouseEvent) => {
    e.stopPropagation();
    setActiveSetting(Setting.Color);
  };

  return (
    <Collapsible
      open={activeSetting === Setting.Color}
      onOpenChange={(open) => setActiveSetting(open ? Setting.Color : null)}
      className="w-full"
    >
      <CollapsibleTrigger className="flex items-center w-full">
        <ChevronRightIcon
          className={activeSetting === Setting.Color ? "rotate-90" : ""}
        />
        Color
        <ToggleGroup className="ml-auto" multiple={false} value={[colorMode]}>
          <ToggleGroupItem value="Color" onClick={handleColorToggleItemClick}>
            Value
          </ToggleGroupItem>
          <ToggleGroupItem
            value="TableValuesRef"
            onClick={handleColorToggleItemClick}
          >
            Table
          </ToggleGroupItem>
          <ToggleGroupItem
            value="TableGroupsRef"
            onClick={handleColorToggleItemClick}
          >
            GroupBy
          </ToggleGroupItem>
          <ToggleGroupItem
            value="randomFromPalette"
            onClick={handleColorToggleItemClick}
          >
            Random
          </ToggleGroupItem>
        </ToggleGroup>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2">Hello world</CollapsibleContent>
    </Collapsible>
  );
}

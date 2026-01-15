import { ColorControl } from "@/components/controls/ColorControl";
import { ColorControlContextProvider } from "@/components/controls/ColorControl/ColorControlContextProvider";
import { ColorSourceControl } from "@/components/controls/ColorControl/ColorSourceControl";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import { type Points, defaultPointColor } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";

const Setting = {
  Color: "color",
} as const;

export function PointsPanelItemSettings({ points }: { points: Points }) {
  const [activeSetting, setActiveSetting] = useState<
    (typeof Setting)[keyof typeof Setting] | null
  >(null);

  const updatePoints = useTissUUmaps((state) => state.updatePoints);

  return (
    <ColorControlContextProvider
      colorConfig={points.pointColor}
      onColorConfigChange={(newColorConfig) =>
        updatePoints(points.id, { pointColor: newColorConfig })
      }
      defaultColorConfigSource="value"
    >
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
          <ColorSourceControl className="ml-auto" />
        </CollapsibleTrigger>
        <CollapsibleContent className="p-2">
          <ColorControl defaultValue={defaultPointColor} />
        </CollapsibleContent>
      </Collapsible>
    </ColorControlContextProvider>
  );
}

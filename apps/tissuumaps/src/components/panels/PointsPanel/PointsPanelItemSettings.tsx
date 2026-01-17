import {
  ColorConfigContextProvider,
  ColorConfigControl,
  ColorConfigSourceToggleGroup,
} from "@/components/controls/ColorConfigControl";

import { type Points, defaultPointColor } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import {
  ConfigControlsAccordion,
  ConfigControlsAccordionHeader,
  ConfigControlsAccordionItem,
  ConfigControlsAccordionPanel,
  ConfigControlsAccordionTrigger,
  ConfigControlsAccordionTriggerIcon,
} from "../../common/ConfigControlsAccordion";

export function PointsPanelItemSettings({ points }: { points: Points }) {
  const updatePoints = useTissUUmaps((state) => state.updatePoints);

  return (
    <ConfigControlsAccordion>
      {/* Point color */}
      <ColorConfigContextProvider
        colorConfig={points.pointColor}
        onColorConfigChange={(c) => updatePoints(points.id, { pointColor: c })}
        defaultColorConfigSource="value"
      >
        <ConfigControlsAccordionItem>
          <ConfigControlsAccordionHeader>
            <ConfigControlsAccordionTriggerIcon />
            <ConfigControlsAccordionTrigger>
              Color
            </ConfigControlsAccordionTrigger>
            <ColorConfigSourceToggleGroup className="ml-auto" />
          </ConfigControlsAccordionHeader>
          <ConfigControlsAccordionPanel>
            <ColorConfigControl defaultValue={defaultPointColor} />
          </ConfigControlsAccordionPanel>
        </ConfigControlsAccordionItem>
      </ColorConfigContextProvider>
    </ConfigControlsAccordion>
  );
}

import { type Shapes } from "@tissuumaps/core";

import { ShapesSettingsPanel } from "./ShapesSettingsPanel";

type ShapesPanelProps = {
  shapes: Shapes;
};

export function ShapesPanel(props: ShapesPanelProps) {
  return (
    <>
      <ShapesSettingsPanel shapes={props.shapes} />
    </>
  );
}

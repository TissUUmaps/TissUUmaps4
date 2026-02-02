import { type Shapes } from "@tissuumaps/core";

import { ShapesPanelItemSettings } from "./ShapesPanelItemSettings";

export function ShapesPanelItem({ shapes }: { shapes: Shapes }) {
  return (
    <>
      <ShapesPanelItemSettings shapes={shapes} />
    </>
  );
}

import { optionIs, rankWith } from "@jsonforms/core";

import { TableSelectRenderer } from "./TableSelectRenderer";

export const RENDERER_OPTION = "x-renderer";

export const renderers = [
  {
    tester: rankWith(10, optionIs(RENDERER_OPTION, "TableSelect")),
    renderer: TableSelectRenderer,
  },
];

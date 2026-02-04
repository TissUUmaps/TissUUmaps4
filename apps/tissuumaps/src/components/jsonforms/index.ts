import {
  and,
  isBooleanControl,
  isControl,
  isEnumControl,
  isIntegerControl,
  isNumberControl,
  isPrimitiveArrayControl,
  isStringControl,
  rankWith,
  scopeEndIs,
  uiTypeIs,
} from "@jsonforms/core";

import { BooleanCell } from "./cells/BooleanCell";
import { IntegerCell } from "./cells/IntegerCell";
import { NumberCell } from "./cells/NumberCell";
import { StringEnumCell } from "./cells/StringEnumCell";
import { TableEnumCell } from "./cells/TableEnumCell";
import { TextCell } from "./cells/TextCell";
import { ArrayControl } from "./controls/ArrayControl";
import { InputControl } from "./controls/InputControl";
import { LabelControl } from "./controls/LabelControl";
import { GroupLayout } from "./layouts/GroupLayout";
import { HorizontalLayout } from "./layouts/HorizontalLayout";
import { VerticalLayout } from "./layouts/VerticalLayout";

export const renderers = [
  { tester: rankWith(1, uiTypeIs("Group")), renderer: GroupLayout },
  { tester: rankWith(1, uiTypeIs("VerticalLayout")), renderer: VerticalLayout },
  {
    tester: rankWith(1, uiTypeIs("HorizontalLayout")),
    renderer: HorizontalLayout,
  },
  { tester: rankWith(1, uiTypeIs("Label")), renderer: LabelControl },
  { tester: rankWith(1, isControl), renderer: InputControl },
  {
    tester: rankWith(2, and(isControl, isPrimitiveArrayControl)),
    renderer: ArrayControl,
  },
];

export const cells = [
  { tester: rankWith(1, isBooleanControl), cell: BooleanCell },
  { tester: rankWith(1, isIntegerControl), cell: IntegerCell },
  { tester: rankWith(1, isNumberControl), cell: NumberCell },
  { tester: rankWith(1, isStringControl), cell: TextCell },
  {
    tester: rankWith(2, and(isStringControl, isEnumControl)),
    cell: StringEnumCell,
  },
  {
    tester: rankWith(3, and(isStringControl, scopeEndIs("table"))),
    cell: TableEnumCell,
  },
];

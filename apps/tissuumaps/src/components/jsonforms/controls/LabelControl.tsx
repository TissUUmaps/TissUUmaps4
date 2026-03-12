import { Label } from "@/components/ui/label";
import { type LabelProps } from "@jsonforms/core";
import { withJsonFormsLabelProps } from "@jsonforms/react";

export const LabelControl = withJsonFormsLabelProps((props: LabelProps) => {
  return <Label hidden={!props.visible}>{props.text}</Label>;
});

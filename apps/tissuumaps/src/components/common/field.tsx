import { Field as FieldPrimitive } from "@base-ui/react/field";

export function Field(props: FieldPrimitive.Root.Props) {
  return <FieldPrimitive.Root {...props} />;
}

export function FieldLabel(props: FieldPrimitive.Label.Props) {
  return <FieldPrimitive.Label {...props} className="text-foreground" />;
}

export function FieldControl(props: FieldPrimitive.Control.Props) {
  return <FieldPrimitive.Control {...props} />;
}

export function FieldDescription(props: FieldPrimitive.Description.Props) {
  return <FieldPrimitive.Description {...props} />;
}

export function FieldItem(props: FieldPrimitive.Item.Props) {
  return <FieldPrimitive.Item {...props} />;
}

export function FieldError(props: FieldPrimitive.Error.Props) {
  return <FieldPrimitive.Error {...props} />;
}

export function FieldValidity(props: FieldPrimitive.Validity.Props) {
  return <FieldPrimitive.Validity {...props} />;
}

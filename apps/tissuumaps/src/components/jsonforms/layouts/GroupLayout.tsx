import { Fieldset } from "@base-ui/react";
import {
  type GroupLayout as GroupLayoutSchema,
  type LayoutProps,
} from "@jsonforms/core";
import {
  JsonFormsDispatch,
  useJsonForms,
  withJsonFormsLayoutProps,
} from "@jsonforms/react";
import React from "react";

// eslint-disable-next-line react-refresh/only-export-components
const MemoizedGroupLayout = React.memo((props: Omit<LayoutProps, "data">) => {
  const layout = props.uischema as GroupLayoutSchema;
  const { renderers, cells } = useJsonForms();
  return (
    <Fieldset.Root hidden={!props.visible} className="flex flex-col">
      {props.label && <Fieldset.Legend>{props.label}</Fieldset.Legend>}
      {layout.elements.map((element, i) => (
        <div key={`${props.path}-${i}`}>
          <JsonFormsDispatch
            renderers={renderers}
            cells={cells}
            uischema={element}
            schema={props.schema}
            path={props.path}
            enabled={props.enabled}
          />
        </div>
      ))}
    </Fieldset.Root>
  );
});

export const GroupLayout = withJsonFormsLayoutProps(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ({ data, ...otherProps }: LayoutProps) => {
    return <MemoizedGroupLayout {...otherProps} />;
  },
  false,
);

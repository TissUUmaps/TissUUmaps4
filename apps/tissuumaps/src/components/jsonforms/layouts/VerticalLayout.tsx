import {
  type LayoutProps,
  type VerticalLayout as VerticalLayoutSchema,
} from "@jsonforms/core";
import {
  JsonFormsDispatch,
  useJsonForms,
  withJsonFormsLayoutProps,
} from "@jsonforms/react";
import React from "react";

const MemoizedVerticalLayout = React.memo(
  (props: Omit<LayoutProps, "data">) => {
    const layout = props.uischema as VerticalLayoutSchema;
    const { renderers, cells } = useJsonForms();
    return (
      <div hidden={!props.visible} className="flex flex-col">
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
      </div>
    );
  },
);

export const VerticalLayout = withJsonFormsLayoutProps(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ({ data, ...otherProps }: LayoutProps) => {
    return <MemoizedVerticalLayout {...otherProps} />;
  },
  false,
);

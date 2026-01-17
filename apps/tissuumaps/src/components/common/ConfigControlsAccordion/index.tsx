import { cn } from "@/lib/utils";
import { Accordion } from "@base-ui/react/accordion";
import { ChevronRightIcon } from "lucide-react";

export function ConfigControlsAccordion({
  className,
  ...props
}: Accordion.Root.Props) {
  return (
    <Accordion.Root className={cn("flex flex-col", className)} {...props} />
  );
}

export function ConfigControlsAccordionItem(props: Accordion.Item.Props) {
  return <Accordion.Item {...props} />;
}

export function ConfigControlsAccordionHeader({
  className,
  children,
  ...props
}: Accordion.Header.Props) {
  return (
    <Accordion.Header
      className={cn("flex flex-row items-center", className)}
      {...props}
    >
      {children}
    </Accordion.Header>
  );
}

export function ConfigControlsAccordionTrigger({
  className,
  children,
  ...props
}: Accordion.Trigger.Props) {
  return (
    <Accordion.Trigger
      className={cn(
        "flex flex-row items-center group/accordion-trigger",
        className,
      )}
      {...props}
    >
      {children}
    </Accordion.Trigger>
  );
}

export function ConfigControlsAccordionTriggerIcon({
  className,
  ...props
}: Omit<Accordion.Trigger.Props, "children">) {
  return (
    <Accordion.Trigger
      className={cn("group/accordion-trigger", className)}
      {...props}
    >
      <ChevronRightIcon className="group-aria-expanded/accordion-trigger:rotate-90" />
    </Accordion.Trigger>
  );
}

export function ConfigControlsAccordionPanel(props: Accordion.Panel.Props) {
  return <Accordion.Panel {...props} />;
}

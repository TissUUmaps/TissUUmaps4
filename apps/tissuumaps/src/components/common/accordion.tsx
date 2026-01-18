import { cn } from "@/lib/utils";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronRightIcon, ChevronUpIcon } from "lucide-react";

export function Accordion({
  className,
  ...props
}: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

export function AccordionItem(props: AccordionPrimitive.Item.Props) {
  return <AccordionPrimitive.Item {...props} />;
}

export function AccordionHeader({
  className,
  children,
  ...props
}: AccordionPrimitive.Header.Props) {
  return (
    <AccordionPrimitive.Header
      className={cn("flex flex-row items-center", className)}
      {...props}
    >
      {children}
    </AccordionPrimitive.Header>
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Trigger
      className={cn(
        "flex flex-row items-center group/accordion-trigger",
        className,
      )}
      {...props}
    >
      {children}
    </AccordionPrimitive.Trigger>
  );
}

export function AccordionTriggerRightIcon({
  className,
  ...props
}: Omit<AccordionPrimitive.Trigger.Props, "children">) {
  return (
    <AccordionPrimitive.Trigger
      className={cn("group/accordion-trigger", className)}
      {...props}
    >
      <ChevronRightIcon className="group-aria-expanded/accordion-trigger:rotate-90" />
    </AccordionPrimitive.Trigger>
  );
}

export function AccordionTriggerUpIcon({
  className,
  ...props
}: Omit<AccordionPrimitive.Trigger.Props, "children">) {
  return (
    <AccordionPrimitive.Trigger
      className={cn("group/accordion-trigger", className)}
      {...props}
    >
      <ChevronUpIcon className="group-aria-expanded/accordion-trigger:rotate-180" />
    </AccordionPrimitive.Trigger>
  );
}

export function AccordionPanel(props: AccordionPrimitive.Panel.Props) {
  return <AccordionPrimitive.Panel {...props} />;
}

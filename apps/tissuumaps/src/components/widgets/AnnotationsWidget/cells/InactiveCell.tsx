import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type InactiveCellProps = {
  /** Whether the cell is grayed out, as editing it changes the property source */
  isInactive: boolean;
  children: ReactNode;
};

export function InactiveCell({ isInactive, children }: InactiveCellProps) {
  // the wrapper stays when the cell turns active, so that the input or picker
  // that turned it active is not remounted
  return (
    <div
      className={cn("flex w-full", isInactive && "opacity-50")}
      title={isInactive ? "Edit to group by this column" : undefined}
    >
      {children}
    </div>
  );
}

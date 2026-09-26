import type { ReactNode } from "react";

export type InactiveCellProps = {
  /** Whether the cell is grayed out, as editing it changes the property source */
  isInactive: boolean;
  children: ReactNode;
};

export function InactiveCell({ isInactive, children }: InactiveCellProps) {
  return isInactive ? (
    <div
      className="flex w-full opacity-50"
      title="Edit to group by this column"
    >
      {children}
    </div>
  ) : (
    children
  );
}

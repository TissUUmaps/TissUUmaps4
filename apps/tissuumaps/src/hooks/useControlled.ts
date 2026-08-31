import { useState } from "react";

/**
 * Backs a component value that may be controlled by its parent or not
 *
 * The value is controlled whenever `controlledValue` is not `undefined`;
 * otherwise, the internally kept value is used. In both cases, the returned
 * setter updates the internal value and notifies `setControlledValue`, so that
 * a component switching from uncontrolled to controlled does not jump back to
 * an outdated value.
 *
 * @param controlledValue - The value set by the parent, if it is controlling it
 * @param setControlledValue - Called with every new value, if provided
 * @param defaultUncontrolledValue - The initial value used while uncontrolled
 * @returns The current value and a setter for it
 */
export function useControlled<T>(
  controlledValue: T | undefined,
  setControlledValue: ((value: T) => void) | undefined,
  defaultUncontrolledValue: T,
): [T, (value: T) => void] {
  const [uncontrolledValue, setUncontrolledValue] = useState<T>(
    defaultUncontrolledValue,
  );
  const value =
    controlledValue !== undefined ? controlledValue : uncontrolledValue;
  const setValue = (newValue: T) => {
    setUncontrolledValue(newValue);
    if (setControlledValue) {
      setControlledValue(newValue);
    }
  };
  return [value, setValue] as const;
}

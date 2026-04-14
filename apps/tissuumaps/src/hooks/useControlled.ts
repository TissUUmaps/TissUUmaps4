import { useState } from "react";

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

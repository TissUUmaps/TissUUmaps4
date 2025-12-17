/** Link to a table column that holds values */
export type TableValuesRef = {
  /** Table ID */
  tableId: string;

  /** Values column */
  valuesCol: string;
};

export function isTableValuesRef(x: unknown): x is TableValuesRef {
  return (
    (x as TableValuesRef).tableId !== undefined &&
    (x as TableValuesRef).valuesCol !== undefined
  );
}

/** Link to a table column that holds groups */
export type TableGroupsRef = {
  /** Table ID */
  tableId: string;

  /** Groups column */
  groupsCol: string;
};

export function isTableGroupsRef(x: unknown): x is TableGroupsRef {
  return (
    (x as TableGroupsRef).tableId !== undefined &&
    (x as TableGroupsRef).groupsCol !== undefined
  );
}

/** A marker shape (see marker atlas) */
export enum Marker {
  Cross,
  Diamond,
  Square,
  TriangleUp,
  Star,
  Clobber,
  Disc,
  HBar,
  VBar,
  TailedArrow,
  TriangleDown,
  Ring,
  X,
  Arrow,
  Gaussian,
}

export function isMarker(x: unknown): x is Marker {
  return (x as Marker) in Marker;
}

/** A color in RGB format */
export type Color = {
  /** Red component, between 0 and 1 */
  r: number;

  /** Green component, between 0 and 1 */
  g: number;

  /** Blue component, between 0 and 1 */
  b: number;
};

export function isColor(x: unknown): x is Color {
  return (
    (x as Color).r !== undefined &&
    (x as Color).g !== undefined &&
    (x as Color).b !== undefined
  );
}

/** Link to a table column that holds values */
export type TableValuesColumn = {
  /** Table ID */
  tableId: string;

  /** Values column */
  valuesCol: string;
};

export function isTableValuesColumn(x: unknown): x is TableValuesColumn {
  return (
    (x as TableValuesColumn).tableId !== undefined &&
    (x as TableValuesColumn).valuesCol !== undefined
  );
}

/** Link to a table column that holds groups */
export type TableGroupsColumn = {
  /** Table ID */
  tableId: string;

  /** Groups column */
  groupsCol: string;
};

export function isTableGroupsColumn(x: unknown): x is TableGroupsColumn {
  return (
    (x as TableGroupsColumn).tableId !== undefined &&
    (x as TableGroupsColumn).groupsCol !== undefined
  );
}

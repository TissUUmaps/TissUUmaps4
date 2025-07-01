/** A 2D similarity transformation */
export type Transform = {
  /** Scale factor (defaults to 1) */
  scale?: number;

  /** Rotation, in degrees (defaults to 0) */
  rotation?: number;

  /** Translation (defaults to 0 for x and y) */
  translation?: {
    /** Translation in the x direction */
    x: number;

    /** Translation in the y direction */
    y: number;
  };
};

/** A color in RGB(A) format */
export type Color = {
  /** Red component, between 0 and 255 */
  r: number;

  /** Green component, between 0 and 255 */
  g: number;

  /** Blue component, between 0 and 255 */
  b: number;

  /** Alpha component, between 0 and 1 */
  a?: number;
};

/** An OpenSeadragon-supported shape */
export type Shape = "circle"; // TODO add more shapes

/** Link to a table column that holds values */
export type TableValuesColumn = {
  /** Table ID */
  tableId: string;

  /** Values column */
  valuesCol: string;
};

/** Link to a table column that holds groups */
export type TableGroupsColumn = {
  /** Table ID */
  tableId: string;

  /** Groups column */
  groupsCol: string;
};

/** Returns true if the column holds values, false otherwise */
export function isTableValuesColumn(x: unknown): x is TableValuesColumn {
  return (
    (x as TableValuesColumn).tableId !== undefined &&
    (x as TableValuesColumn).valuesCol !== undefined
  );
}

/** Returns true if the column holds group names, false otherwise */
export function isTableGroupsColumn(x: unknown): x is TableGroupsColumn {
  return (
    (x as TableGroupsColumn).tableId !== undefined &&
    (x as TableGroupsColumn).groupsCol !== undefined
  );
}

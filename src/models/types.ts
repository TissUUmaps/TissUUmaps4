/** A 2D similarity transformation */
export type Transform = {
  /** Translation (defaults to 0 for x and y) */
  translation?: {
    /** Translation in the x direction */
    x: number;

    /** Translation in the y direction */
    y: number;
  };

  /** Rotation, in degrees (defaults to 0) */
  rotation?: number;

  /** Scale factor (defaults to 1) */
  scale?: number;

  /** Horizontal reflection (defaults to false) */
  flip?: boolean;
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

/** A column that holds values */
export type ValuesColumn = {
  /** Column name */
  valuesCol: string;
};

/** A column that holds group names */
export type GroupsColumn = {
  /** Column name */
  groupsCol: string;
};

/** Returns true if the column holds values, false otherwise */
export function isValuesColumn(col: unknown): col is ValuesColumn {
  return (col as ValuesColumn).valuesCol !== undefined;
}

/** Returns true if the column holds group names, false otherwise */
export function isGroupsColumn(col: unknown): col is GroupsColumn {
  return (col as GroupsColumn).groupsCol !== undefined;
}

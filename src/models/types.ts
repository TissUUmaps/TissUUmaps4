import OpenSeadragon from "openseadragon";

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
  /** Red component, between 0 and 255 */
  r: number;

  /** Green component, between 0 and 255 */
  g: number;

  /** Blue component, between 0 and 255 */
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

/** Similarity transform */
export type SimilarityTransform = {
  /** Scale factor */
  scale: number;

  /** Rotation around origin, in degrees */
  rotation: number;

  /** Translation, applied after scaling and rotation */
  translation: { x: number; y: number };
};

/** WebGL Points Options */
export type DrawOptions = {
  /** Point size factor (defaults to 1.0) */
  pointSizeFactor: number;
};

/** OpenSeadragon viewer options */
export type ViewerOptions = Exclude<
  OpenSeadragon.Options,
  "element" | "drawer"
>;

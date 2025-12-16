/** A marker shape (see marker atlas) */
export const Marker = {
  Cross: 0,
  Diamond: 1,
  Square: 2,
  TriangleUp: 3,
  Star: 4,
  Clobber: 5,
  Disc: 6,
  HBar: 7,
  VBar: 8,
  TailedArrow: 9,
  TriangleDown: 10,
  Ring: 11,
  X: 12,
  Arrow: 13,
  Gaussian: 14,
} as const;

export type Marker = (typeof Marker)[keyof typeof Marker];

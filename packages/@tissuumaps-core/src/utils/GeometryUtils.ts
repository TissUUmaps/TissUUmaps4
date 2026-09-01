import type { Dims, Rect } from "../types/geometry";

/** Utility methods for rectangle and dimension geometry */
export class GeometryUtils {
  /**
   * Computes the union of multiple rectangles and returns the smallest rectangle that contains all of them
   *
   * @param rects - The rectangles to compute the union of
   * @returns The smallest rectangle that contains all the input rectangles, or `null` if no rectangles are provided
   */
  static boundingBox(...rects: Rect[]): Rect | null {
    return rects.reduce<Rect | null>((union, rect) => {
      if (union === null) {
        return rect;
      }
      const x = Math.min(union.x, rect.x);
      const y = Math.min(union.y, rect.y);
      const width = Math.max(union.x + union.width, rect.x + rect.width) - x;
      const height = Math.max(union.y + union.height, rect.y + rect.height) - y;
      return { x, y, width, height };
    }, null);
  }

  /**
   * Checks if two dimensions are equal by comparing their width and height properties
   *
   * @param a - The first dimensions to compare
   * @param b - The second dimensions to compare
   * @returns `true` if the dimensions are equal, `false` otherwise
   */
  static dimsEquals(a: Dims, b: Dims): boolean {
    return a.width === b.width && a.height === b.height;
  }

  /**
   * Checks if two rectangles are equal by comparing their x, y, width, and height properties
   *
   * @param a - The first rectangle to compare
   * @param b - The second rectangle to compare
   * @returns `true` if the rectangles are equal, `false` otherwise
   */
  static rectEquals(a: Rect, b: Rect): boolean {
    return (
      a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
    );
  }
}

import type { ShapesGeometry } from "../storage/shapes";

/** A ring of a polygon, as a sequence of positions holding x and y first */
export type ShapesRing = readonly (readonly number[])[];

/** A polygon, as its shell ring followed by its hole rings */
export type ShapesPolygon = readonly ShapesRing[];

/**
 * Appends one shape to a {@link ShapesGeometry} under construction
 *
 * Polygons without a valid shell are skipped, as are rings with fewer than
 * three vertices.
 *
 * @param polygons - The polygons the shape is made of
 * @returns Whether a shape was appended
 */
export type ShapesAppender = (polygons: readonly ShapesPolygon[]) => boolean;

/** Static helpers for shapes geometry */
export class ShapesUtils {
  /**
   * Builds a shapes geometry from the shapes appended by a callback
   *
   * The CSR offset arrays are grown as shapes are appended, so the shapes of a
   * file can be consumed as they are decoded rather than collected first. The
   * accumulator is scoped to this call and cannot be used once it returns.
   *
   * @param appendShapes - Callback appending the shapes, receiving the appender
   * @returns The shapes geometry, in typed arrays ready to be transferred
   */
  // No signal option: this performs no cancellable work of its own, and
  // appendShapes owns whatever it awaits.
  static async buildGeometry(
    appendShapes: (append: ShapesAppender) => void | Promise<void>,
  ): Promise<ShapesGeometry> {
    const shapePolygonOffsets: number[] = [0];
    const polygonRingOffsets: number[] = [0];
    const ringVertexOffsets: number[] = [0];
    const coords: number[] = [];
    const append: ShapesAppender = (polygons) => {
      let polygonsAppended = false;
      for (const rings of polygons) {
        if (rings.length === 0 || rings[0]!.length < 3) {
          console.warn("Skipping polygon without a valid shell.");
          continue;
        }
        let ringsAppended = false;
        for (const ring of rings) {
          if (ring.length < 3) {
            console.warn(
              "Skipping invalid ring with fewer than three vertices.",
            );
            continue;
          }
          for (const position of ring) {
            coords.push(position[0]!, position[1]!);
          }
          ringVertexOffsets.push(coords.length / 2);
          ringsAppended = true;
        }
        if (!ringsAppended) {
          console.warn("Skipping polygon without valid rings.");
          continue;
        }
        polygonRingOffsets.push(ringVertexOffsets.length - 1);
        polygonsAppended = true;
      }
      if (!polygonsAppended) {
        return false;
      }
      shapePolygonOffsets.push(polygonRingOffsets.length - 1);
      return true;
    };
    await appendShapes(append);
    return {
      shapePolygonOffsets: new Uint32Array(shapePolygonOffsets),
      polygonRingOffsets: new Uint32Array(polygonRingOffsets),
      ringVertexOffsets: new Uint32Array(ringVertexOffsets),
      coords: new Float32Array(coords),
    };
  }
}

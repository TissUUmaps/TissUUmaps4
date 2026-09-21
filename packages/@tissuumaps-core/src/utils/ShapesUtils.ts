import type { ShapesGeometry } from "../storage/shapes";

/** A ring of a polygon, as a sequence of positions holding x and y first */
export type ShapesRing = readonly (readonly number[])[];

/** A polygon, as its shell ring followed by its hole rings */
export type ShapesPolygon = readonly ShapesRing[];

/**
 * Appends one shape to a {@link ShapesGeometry} under construction
 *
 * Polygons without a valid shell are skipped, as are rings with fewer than
 * three vertices. A shape left without polygons is not appended, and
 * contributes neither an ID nor a name.
 *
 * @param polygons - The polygons the shape is made of
 * @param id - The ID of the shape
 * @param name - The name of the shape, if any
 */
export type ShapesAppender = (
  polygons: readonly ShapesPolygon[],
  id: number,
  name?: string,
) => void;

/** Static helpers for shapes geometry */
export class ShapesUtils {
  /**
   * Builds a shapes geometry from the shapes appended by a callback
   *
   * The CSR offset arrays are grown as shapes are appended, so the shapes of a
   * file can be consumed as they are decoded rather than collected first. The
   * appender must not be used once this call returns.
   *
   * The IDs and names are collected as the shapes are appended, so that they
   * stay aligned with the geometry when a shape is skipped. Names are returned
   * only if every appended shape was given one.
   *
   * @param appendShapes - Callback appending the shapes, receiving the appender
   * @returns The shapes geometry, in typed arrays ready to be transferred,
   * along with the IDs and names of the appended shapes
   */
  // No signal option: this performs no cancellable work of its own, and
  // appendShapes owns whatever it awaits.
  static async buildGeometry(
    appendShapes: (append: ShapesAppender) => void | Promise<void>,
  ): Promise<{
    geometry: ShapesGeometry;
    ids: number[];
    names: string[] | undefined;
  }> {
    const shapePolygonOffsets: number[] = [0];
    const polygonRingOffsets: number[] = [0];
    const ringVertexOffsets: number[] = [0];
    const coords: number[] = [];
    const ids: number[] = [];
    const names: string[] = [];
    const append: ShapesAppender = (polygons, id, name) => {
      let polygonsAppended = false;
      for (const rings of polygons) {
        if (rings.length === 0 || rings[0]!.length < 3) {
          console.warn("Skipping polygon without a valid shell.");
          continue;
        }
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
        }
        polygonRingOffsets.push(ringVertexOffsets.length - 1);
        polygonsAppended = true;
      }
      if (!polygonsAppended) {
        return;
      }
      shapePolygonOffsets.push(polygonRingOffsets.length - 1);
      ids.push(id);
      if (name !== undefined) {
        names.push(name);
      }
    };
    await appendShapes(append);
    return {
      geometry: {
        shapePolygonOffsets: new Uint32Array(shapePolygonOffsets),
        polygonRingOffsets: new Uint32Array(polygonRingOffsets),
        ringVertexOffsets: new Uint32Array(ringVertexOffsets),
        coords: new Float32Array(coords),
      },
      ids,
      names: names.length === ids.length ? names : undefined,
    };
  }
}

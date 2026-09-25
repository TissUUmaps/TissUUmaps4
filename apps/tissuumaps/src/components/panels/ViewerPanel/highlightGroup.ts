import type {
  HighlightedGroup,
  Labels,
  OpacityConfig,
  Points,
  Shapes,
  VisibilityConfig,
} from "@tissuumaps/core";
import type { ViewerAdapter } from "@tissuumaps/viewer";

/** ID of the transient opacity map that shows only the highlighted group */
const highlightOpacityMapId = "highlightedGroup";

export type HighlightableState = Pick<
  ViewerAdapter,
  "labels" | "points" | "shapes" | "opacityMaps"
>;

/**
 * Overrides the opacity configurations of every object annotated by the
 * highlighted group's table so that only the highlighted group is shown
 *
 * The visibility configurations are overridden as well, so that a hidden group
 * is shown while it is highlighted; the other groups are hidden by their
 * opacity.
 *
 * The project itself is left untouched; the returned state is only handed to
 * the viewer.
 *
 * A new opacity map is built on every call, and the renderers compare maps by
 * identity, so callers memoize the result on the state and the highlighted
 * group. A collection without an object on the highlighted table is returned
 * as is, so that its renderer is not woken up for a change it does not see.
 *
 * @param state - Objects and opacity maps of the project
 * @param highlightedGroup - The highlighted group, or `null` for none
 * @returns The state to render
 */
export function highlightGroup(
  state: HighlightableState,
  highlightedGroup: HighlightedGroup | null,
): HighlightableState {
  if (highlightedGroup === null) {
    return state;
  }
  const { tableId, column, group } = highlightedGroup;
  const opacityConfig: OpacityConfig = {
    groupBy: { column, map: highlightOpacityMapId },
  };
  const visibilityConfig: VisibilityConfig = { constant: { value: true } };
  return {
    labels: overrideOnTable(state.labels, tableId, (labels) => ({
      ...labels,
      labelVisibility: visibilityConfig,
      labelOpacity: opacityConfig,
    })),
    points: overrideOnTable(state.points, tableId, (points) => ({
      ...points,
      pointVisibility: visibilityConfig,
      pointOpacity: opacityConfig,
    })),
    shapes: overrideOnTable(state.shapes, tableId, (shapes) => ({
      ...shapes,
      shapeVisibility: visibilityConfig,
      shapeOpacity: opacityConfig,
    })),
    // maps are looked up by their first match, so that a project map with the
    // same ID does not win
    opacityMaps: [
      {
        id: highlightOpacityMapId,
        name: "Highlighted group",
        values: { [group]: 1 },
        default: 0,
      },
      ...state.opacityMaps,
    ],
  };
}

/**
 * Overrides the objects annotated by a table, keeping the array when there are none
 *
 * @param objects - The objects of one collection
 * @param table - ID of the highlighted group's table
 * @param override - Returns the object with its opacity overridden
 * @returns The collection with its objects on the table overridden, or the
 * very same array if none of them is
 */
function overrideOnTable<TObject extends Labels | Points | Shapes>(
  objects: TObject[],
  tableId: string,
  override: (object: TObject) => TObject,
): TObject[] {
  return objects.some((object) => object.dataSource.table === tableId)
    ? objects.map((object) =>
        object.dataSource.table === tableId ? override(object) : object,
      )
    : objects;
}

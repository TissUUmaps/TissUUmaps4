import { describe, expect, it } from "vitest";

import { createLabels, createPoints, createShapes } from "@tissuumaps/core";

import {
  type HighlightableState,
  highlightItemGroup,
} from "./highlightItemGroup";

describe("highlightItemGroup", () => {
  const state: HighlightableState = {
    labels: [
      createLabels({
        id: "labels",
        name: "Labels",
        layer: "layer",
        dataSource: { type: "tiff", table: "other" },
      }),
    ],
    points: [
      createPoints({
        id: "points",
        name: "Points",
        layer: "layer",
        dataSource: { type: "csv", table: "cells" },
      }),
      createPoints({
        id: "unannotated",
        name: "Unannotated",
        layer: "layer",
        dataSource: { type: "csv" },
      }),
    ],
    shapes: [
      createShapes({
        id: "shapes",
        name: "Shapes",
        layer: "layer",
        dataSource: { type: "geojson", table: "cells" },
        shapeStrokeVisibility: { constant: { value: false } },
      }),
    ],
    opacityMaps: [
      { id: "highlightedItemGroup", name: "Project map", values: { A: 0 } },
    ],
  };
  const highlightedItemGroup = {
    tableId: "cells",
    column: "cluster",
    group: "A",
  };

  it("returns the state itself without a highlighted group", () => {
    expect(highlightItemGroup(state, null)).toBe(state);
  });

  it("shows only the highlighted group of the objects on its table", () => {
    const highlightedState = highlightItemGroup(state, highlightedItemGroup);

    const opacityConfig = {
      groupBy: { column: "cluster", map: "highlightedItemGroup" },
    };
    expect(highlightedState.points[0]!.pointOpacity).toEqual(opacityConfig);
    expect(highlightedState.shapes[0]!.shapeOpacity).toEqual(opacityConfig);
    expect(highlightedState.opacityMaps[0]).toEqual({
      id: "highlightedItemGroup",
      name: "Highlighted group",
      values: { A: 1 },
      default: 0,
    });
  });

  it("puts its map before the project maps, which it keeps", () => {
    const highlightedState = highlightItemGroup(state, highlightedItemGroup);

    expect(highlightedState.opacityMaps.slice(1)).toEqual(state.opacityMaps);
  });

  it("overrides the labels on its table", () => {
    const labels = createLabels({
      id: "labels",
      name: "Labels",
      layer: "layer",
      dataSource: { type: "tiff", table: "cells" },
    });

    const highlightedState = highlightItemGroup(
      { ...state, labels: [labels] },
      highlightedItemGroup,
    );

    expect(highlightedState.labels[0]!.labelOpacity).toEqual({
      groupBy: { column: "cluster", map: "highlightedItemGroup" },
    });
    expect(highlightedState.labels[0]!.labelVisibility).toEqual({
      constant: { value: true },
    });
  });

  it("shows the highlighted group even if it is hidden", () => {
    const highlightedState = highlightItemGroup(state, highlightedItemGroup);

    const visibilityConfig = { constant: { value: true } };
    expect(highlightedState.points[0]!.pointVisibility).toEqual(
      visibilityConfig,
    );
    expect(highlightedState.shapes[0]!.shapeVisibility).toEqual(
      visibilityConfig,
    );
  });

  it("keeps the fill and stroke settings of shapes", () => {
    const highlightedState = highlightItemGroup(state, highlightedItemGroup);

    expect(highlightedState.shapes[0]!.shapeStrokeVisibility).toEqual({
      constant: { value: false },
    });
    expect(highlightedState.shapes[0]!.shapeFillOpacity).toEqual(
      state.shapes[0]!.shapeFillOpacity,
    );
  });

  it("leaves the objects on other tables untouched", () => {
    const highlightedState = highlightItemGroup(state, highlightedItemGroup);

    expect(highlightedState.points[1]).toBe(state.points[1]);
  });

  it("keeps a collection without an object on the table as is", () => {
    const highlightedState = highlightItemGroup(state, highlightedItemGroup);

    expect(highlightedState.labels).toBe(state.labels);
  });
});

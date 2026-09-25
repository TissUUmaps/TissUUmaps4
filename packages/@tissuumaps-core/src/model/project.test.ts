import { describe, expect, it } from "vitest";

import { createProject, getReferencedMapIds } from "./project";

describe("project", () => {
  describe("getReferencedMapIds", () => {
    it("returns the maps of the group-by configurations, whatever their source", () => {
      const project = createProject({
        name: "Project",
        labels: [
          {
            id: "labels",
            name: "Labels",
            layer: "layer",
            dataSource: { type: "tiff" },
            labelVisibility: {
              groupBy: { column: "cluster", map: "visibilityMap" },
            },
          },
        ],
        points: [
          {
            id: "points",
            name: "Points",
            layer: "layer",
            dataSource: { type: "csv" },
            pointColor: {
              source: "constant",
              constant: { value: { r: 0, g: 0, b: 0 } },
              groupBy: { column: "cluster", map: "colorMap" },
            },
            pointMarker: { groupBy: { column: "cluster", map: undefined } },
          },
        ],
        shapes: [
          {
            id: "shapes",
            name: "Shapes",
            layer: "layer",
            dataSource: { type: "csv" },
            shapeStrokeOpacity: {
              groupBy: { column: "cluster", map: "opacityMap" },
            },
          },
        ],
      });

      expect(getReferencedMapIds(project)).toEqual(
        new Set(["visibilityMap", "colorMap", "opacityMap"]),
      );
    });
  });
});

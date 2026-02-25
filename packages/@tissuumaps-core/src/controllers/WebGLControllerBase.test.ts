import { mat3 } from "gl-matrix";
import { describe, expect, it } from "vitest";

import { type LayerConfig } from "../model/base";
import { type Layer } from "../model/layer";
import { type Rect } from "../types";
import { WebGLControllerBase } from "./WebGLControllerBase";

// Helper function to reduce repetitive matrix transformation code
function transformPoint(
  matrix: mat3,
  point: [number, number, number],
): [number, number, number] {
  const result: [number, number, number] = [0, 0, 0];
  mat3.multiply(result, matrix, point);
  return result;
}

// Concrete test class to access protected static methods
class TestWebGLControllerBase extends WebGLControllerBase {
  static testCreateDataToWorldMatrix(layer: Layer, layerConfig: LayerConfig) {
    return this.createDataToWorldMatrix(layer, layerConfig);
  }

  static testCreateWorldToViewportMatrix(viewport: Rect) {
    return this.createWorldToViewportMatrix(viewport);
  }

  static testCreateViewportToWorldMatrix(viewport: Rect) {
    return this.createViewportToWorldMatrix(viewport);
  }

  static testCreateWorldToDataMatrix(layer: Layer, layerConfig: LayerConfig) {
    return this.createWorldToDataMatrix(layer, layerConfig);
  }
}

type MockGl = {
  canvas: { width: number; height: number };
};

const createMockGl = (): MockGl => ({
  canvas: { width: 800, height: 600 },
});

describe("WebGLControllerBase", () => {
  describe("constructor", () => {
    it("stores the WebGL2 rendering context", () => {
      const mockGl = createMockGl() as unknown as WebGL2RenderingContext;
      const controller = new WebGLControllerBase(mockGl);

      expect(controller["_gl"]).toBe(mockGl);
    });
  });

  describe("createDataToWorldMatrix", () => {
    it("creates identity matrix with default layer and config", () => {
      const layer: Layer = {
        id: "layer1",
        name: "layer1",
        transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
        visibility: true,
        opacity: 1,
        pointSizeFactor: 1,
      };
      const layerConfig: LayerConfig = {
        layer: "layer1",
        transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
        flip: false,
      };

      const matrix = TestWebGLControllerBase.testCreateDataToWorldMatrix(
        layer,
        layerConfig,
      );

      const identityMatrix = mat3.create();
      expect(matrix).toEqual(identityMatrix);
    });

    it("applies flip transformation when flip flag is true", () => {
      const layer: Layer = {
        id: "layer1",
        name: "layer1",
        transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
        visibility: true,
        opacity: 1,
        pointSizeFactor: 1,
      };
      const layerConfig: LayerConfig = {
        layer: "layer1",
        transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
        flip: true,
      };

      const matrix = TestWebGLControllerBase.testCreateDataToWorldMatrix(
        layer,
        layerConfig,
      );

      const expectedMatrix = mat3.fromScaling(mat3.create(), [-1, 1]);
      expect(matrix).toEqual(expectedMatrix);
    });

    it("applies data to layer transform", () => {
      const layer: Layer = {
        id: "layer1",
        name: "layer1",
        transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
        visibility: true,
        opacity: 1,
        pointSizeFactor: 1,
      };
      const layerConfig: LayerConfig = {
        layer: "layer1",
        transform: { translation: { x: 10, y: 20 }, rotation: 0, scale: 2 },
        flip: false,
      };

      const matrix = TestWebGLControllerBase.testCreateDataToWorldMatrix(
        layer,
        layerConfig,
      );

      // Scale 2 and translate (10, 20): (1,1) -> (2,2) -> (12,22)
      const [x, y] = transformPoint(matrix, [1, 1, 1]);
      expect(x).toBeCloseTo(12);
      expect(y).toBeCloseTo(22);
    });

    it("applies layer to world transform", () => {
      const layer: Layer = {
        id: "layer1",
        name: "layer1",
        transform: { translation: { x: 5, y: 10 }, rotation: 0, scale: 1.5 },
        visibility: true,
        opacity: 1,
        pointSizeFactor: 1,
      };
      const layerConfig: LayerConfig = {
        layer: "layer1",
        transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
        flip: false,
      };

      const matrix = TestWebGLControllerBase.testCreateDataToWorldMatrix(
        layer,
        layerConfig,
      );

      // Scale 1.5 and translate (5, 10): (2,3) -> (3,4.5) -> (8,14.5)
      const [x, y] = transformPoint(matrix, [2, 3, 1]);
      expect(x).toBeCloseTo(8);
      expect(y).toBeCloseTo(14.5);
    });

    it("combines flip, data-to-layer, and layer-to-world transforms", () => {
      const layer: Layer = {
        id: "layer1",
        name: "layer1",
        transform: { translation: { x: 100, y: 200 }, rotation: 0, scale: 2 },
        visibility: true,
        opacity: 1,
        pointSizeFactor: 1,
      };
      const layerConfig: LayerConfig = {
        layer: "layer1",
        transform: { translation: { x: 10, y: 20 }, rotation: 0, scale: 3 },
        flip: true,
      };

      const matrix = TestWebGLControllerBase.testCreateDataToWorldMatrix(
        layer,
        layerConfig,
      );

      // Flip: (1,1) -> (-1,1)
      // Scale 3, translate (10,20): (-1,1) -> (-3,3) -> (7,23)
      // Scale 2, translate (100,200): (7,23) -> (14,46) -> (114,246)
      const [x, y] = transformPoint(matrix, [1, 1, 1]);
      expect(x).toBeCloseTo(114);
      expect(y).toBeCloseTo(246);
    });

    it("applies rotation in data-to-layer transform", () => {
      const layer: Layer = {
        id: "layer1",
        name: "layer1",
        transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
        visibility: true,
        opacity: 1,
        pointSizeFactor: 1,
      };
      const layerConfig: LayerConfig = {
        layer: "layer1",
        transform: { translation: { x: 0, y: 0 }, rotation: 90, scale: 1 },
        flip: false,
      };

      const matrix = TestWebGLControllerBase.testCreateDataToWorldMatrix(
        layer,
        layerConfig,
      );

      // 90° CCW rotation: (1,0) -> (0,1)
      const [x, y] = transformPoint(matrix, [1, 0, 1]);
      expect(x).toBeCloseTo(0);
      expect(y).toBeCloseTo(1);
    });

    it("applies rotation in layer-to-world transform", () => {
      const layer: Layer = {
        id: "layer1",
        name: "layer1",
        transform: { translation: { x: 0, y: 0 }, rotation: 90, scale: 1 },
        visibility: true,
        opacity: 1,
        pointSizeFactor: 1,
      };
      const layerConfig: LayerConfig = {
        layer: "layer1",
        transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
        flip: false,
      };

      const matrix = TestWebGLControllerBase.testCreateDataToWorldMatrix(
        layer,
        layerConfig,
      );

      // 90° CCW rotation applied at world level: (1,0) -> (0,1)
      const [x, y] = transformPoint(matrix, [1, 0, 1]);
      expect(x).toBeCloseTo(0);
      expect(y).toBeCloseTo(1);
    });

    it("combines rotation, translation, scale, and flip", () => {
      const layer: Layer = {
        id: "layer1",
        name: "layer1",
        transform: { translation: { x: 10, y: 0 }, rotation: 90, scale: 1 },
        visibility: true,
        opacity: 1,
        pointSizeFactor: 1,
      };
      const layerConfig: LayerConfig = {
        layer: "layer1",
        transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 2 },
        flip: true,
      };

      const matrix = TestWebGLControllerBase.testCreateDataToWorldMatrix(
        layer,
        layerConfig,
      );

      // Flip: (1,0) -> (-1,0)
      // Data-to-layer: scale 2 -> (-2,0), no rotation, no translation
      // Layer-to-world: scale 1 -> (-2,0), rotate 90° -> (0,-2), translate (10,0) -> (10,-2)
      const [x, y] = transformPoint(matrix, [1, 0, 1]);
      expect(x).toBeCloseTo(10);
      expect(y).toBeCloseTo(-2);
    });
  });

  describe("createWorldToViewportMatrix", () => {
    it("maps world origin to viewport origin", () => {
      const viewport: Rect = { x: 0, y: 0, width: 100, height: 100 };

      const matrix =
        TestWebGLControllerBase.testCreateWorldToViewportMatrix(viewport);

      const [x, y] = transformPoint(matrix, [0, 0, 1]);
      expect(x).toBeCloseTo(0);
      expect(y).toBeCloseTo(0);
    });

    it("maps world bounds to [0,1] range", () => {
      const viewport: Rect = { x: 10, y: 20, width: 100, height: 50 };

      const matrix =
        TestWebGLControllerBase.testCreateWorldToViewportMatrix(viewport);

      // Bottom-left corner of viewport (10, 20) should map to (0, 0)
      const [x0, y0] = transformPoint(matrix, [10, 20, 1]);
      expect(x0).toBeCloseTo(0);
      expect(y0).toBeCloseTo(0);

      // Top-right corner (110, 70) should map to (1, 1)
      const [x1, y1] = transformPoint(matrix, [110, 70, 1]);
      expect(x1).toBeCloseTo(1);
      expect(y1).toBeCloseTo(1);
    });

    it("handles different viewport dimensions", () => {
      const viewport: Rect = { x: 50, y: 100, width: 200, height: 400 };

      const matrix =
        TestWebGLControllerBase.testCreateWorldToViewportMatrix(viewport);

      // Center of viewport
      const [x, y] = transformPoint(matrix, [150, 300, 1]);
      expect(x).toBeCloseTo(0.5);
      expect(y).toBeCloseTo(0.5);
    });
  });

  describe("createViewportToWorldMatrix", () => {
    it("is inverse of createWorldToViewportMatrix", () => {
      const viewport: Rect = { x: 10, y: 20, width: 100, height: 50 };

      const worldToViewport =
        TestWebGLControllerBase.testCreateWorldToViewportMatrix(viewport);
      const viewportToWorld =
        TestWebGLControllerBase.testCreateViewportToWorldMatrix(viewport);

      const composed = mat3.create();
      mat3.multiply(composed, worldToViewport, viewportToWorld);

      const identity = mat3.create();
      for (let i = 0; i < 9; i++) {
        expect(composed[i]).toBeCloseTo(identity[i]!);
      }
    });

    it("maps viewport origin to world origin", () => {
      const viewport: Rect = { x: 50, y: 100, width: 200, height: 150 };

      const matrix =
        TestWebGLControllerBase.testCreateViewportToWorldMatrix(viewport);

      const [x, y] = transformPoint(matrix, [0, 0, 1]);
      expect(x).toBeCloseTo(50);
      expect(y).toBeCloseTo(100);
    });

    it("maps viewport [1,1] to world bounds", () => {
      const viewport: Rect = { x: 10, y: 20, width: 100, height: 50 };

      const matrix =
        TestWebGLControllerBase.testCreateViewportToWorldMatrix(viewport);

      const [x, y] = transformPoint(matrix, [1, 1, 1]);
      expect(x).toBeCloseTo(110);
      expect(y).toBeCloseTo(70);
    });
  });

  describe("createWorldToDataMatrix", () => {
    it("is inverse of createDataToWorldMatrix", () => {
      const layer: Layer = {
        id: "layer1",
        name: "layer1",
        transform: { translation: { x: 10, y: 20 }, rotation: 0, scale: 2 },
        visibility: true,
        opacity: 1,
        pointSizeFactor: 1,
      };
      const layerConfig: LayerConfig = {
        layer: "layer1",
        transform: { translation: { x: 5, y: 10 }, rotation: 0, scale: 1.5 },
        flip: false,
      };

      const dataToWorld = TestWebGLControllerBase.testCreateDataToWorldMatrix(
        layer,
        layerConfig,
      );
      const worldToData = TestWebGLControllerBase.testCreateWorldToDataMatrix(
        layer,
        layerConfig,
      );

      const composed = mat3.create();
      mat3.multiply(composed, worldToData, dataToWorld);

      const identity = mat3.create();
      for (let i = 0; i < 9; i++) {
        expect(composed[i]).toBeCloseTo(identity[i]!);
      }
    });

    it("handles flip transformation in reverse", () => {
      const layer: Layer = {
        id: "layer1",
        name: "layer1",
        transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
        visibility: true,
        opacity: 1,
        pointSizeFactor: 1,
      };
      const layerConfig: LayerConfig = {
        layer: "layer1",
        transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
        flip: true,
      };

      const worldToData = TestWebGLControllerBase.testCreateWorldToDataMatrix(
        layer,
        layerConfig,
      );

      // Flipped twice should give identity
      const expectedMatrix = mat3.fromScaling(mat3.create(), [-1, 1]);
      expect(worldToData).toEqual(expectedMatrix);
    });

    it("inverts layer-to-world and data-to-layer transforms", () => {
      const layer: Layer = {
        id: "layer1",
        name: "layer1",
        transform: { translation: { x: 100, y: 200 }, rotation: 0, scale: 2 },
        visibility: true,
        opacity: 1,
        pointSizeFactor: 1,
      };
      const layerConfig: LayerConfig = {
        layer: "layer1",
        transform: { translation: { x: 10, y: 20 }, rotation: 0, scale: 3 },
        flip: false,
      };

      const worldToData = TestWebGLControllerBase.testCreateWorldToDataMatrix(
        layer,
        layerConfig,
      );

      // Forward: (1,1) -> scale 3 -> (3,3) -> translate (10,20) -> (13,23) -> scale 2 -> (26,46) -> translate (100,200) -> (126,246)
      // Backward: (126,246) should map back to (1,1)
      const [x, y] = transformPoint(worldToData, [126, 246, 1]);
      expect(x).toBeCloseTo(1);
      expect(y).toBeCloseTo(1);
    });

    it("is inverse of createDataToWorldMatrix with rotation", () => {
      const layer: Layer = {
        id: "layer1",
        name: "layer1",
        transform: { translation: { x: 10, y: 20 }, rotation: 30, scale: 2 },
        visibility: true,
        opacity: 1,
        pointSizeFactor: 1,
      };
      const layerConfig: LayerConfig = {
        layer: "layer1",
        transform: { translation: { x: 5, y: 5 }, rotation: 45, scale: 3 },
        flip: true,
      };

      const dataToWorld = TestWebGLControllerBase.testCreateDataToWorldMatrix(
        layer,
        layerConfig,
      );
      const worldToData = TestWebGLControllerBase.testCreateWorldToDataMatrix(
        layer,
        layerConfig,
      );

      const composed = mat3.create();
      mat3.multiply(composed, worldToData, dataToWorld);

      const identity = mat3.create();
      for (let i = 0; i < 9; i++) {
        expect(composed[i]).toBeCloseTo(identity[i]!);
      }
    });
  });
});

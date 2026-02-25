/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WebGLShapesController } from "./WebGLShapesController";

// Mock shaders
vi.mock("../assets/shaders/shapes.frag?raw", () => ({
  default: "fragment shader source",
}));
vi.mock("../assets/shaders/shapes.vert?raw", () => ({
  default: "vertex shader source",
}));
type MockGl = {
  VERTEX_SHADER: number;
  FRAGMENT_SHADER: number;
  RGBA32F: number;
  R32UI: number;
  RGBA: number;
  RED_INTEGER: number;
  FLOAT: number;
  UNSIGNED_INT: number;
  TEXTURE_2D: number;
  TRIANGLE_STRIP: number;
  BLEND: number;
  FUNC_ADD: number;
  TEXTURE1: number;
  TEXTURE2: number;
  TEXTURE3: number;
  canvas: { width: number; height: number };
  createShader: ReturnType<typeof vi.fn>;
  createProgram: ReturnType<typeof vi.fn>;
  shaderSource: ReturnType<typeof vi.fn>;
  compileShader: ReturnType<typeof vi.fn>;
  attachShader: ReturnType<typeof vi.fn>;
  linkProgram: ReturnType<typeof vi.fn>;
  getProgramParameter: ReturnType<typeof vi.fn>;
  deleteShader: ReturnType<typeof vi.fn>;
  useProgram: ReturnType<typeof vi.fn>;
  deleteProgram: ReturnType<typeof vi.fn>;
  getUniformLocation: ReturnType<typeof vi.fn>;
  createTexture: ReturnType<typeof vi.fn>;
  bindTexture: ReturnType<typeof vi.fn>;
  deleteTexture: ReturnType<typeof vi.fn>;
  texParameteri: ReturnType<typeof vi.fn>;
  texStorage2D: ReturnType<typeof vi.fn>;
  texSubImage2D: ReturnType<typeof vi.fn>;
  activeTexture: ReturnType<typeof vi.fn>;
  uniform1f: ReturnType<typeof vi.fn>;
  uniform1i: ReturnType<typeof vi.fn>;
  uniform1ui: ReturnType<typeof vi.fn>;
  uniform4f: ReturnType<typeof vi.fn>;
  uniformMatrix3x2fv: ReturnType<typeof vi.fn>;
  enable: ReturnType<typeof vi.fn>;
  disable: ReturnType<typeof vi.fn>;
  blendEquation: ReturnType<typeof vi.fn>;
  blendFuncSeparate: ReturnType<typeof vi.fn>;
  drawArrays: ReturnType<typeof vi.fn>;
};
const createMockGl = (): MockGl => {
  return {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    RGBA32F: 0x8814,
    R32UI: 0x8236,
    RGBA: 0x1908,
    RED_INTEGER: 0x8d94,
    FLOAT: 0x1406,
    UNSIGNED_INT: 0x1405,
    TEXTURE_2D: 0x0de1,
    TRIANGLE_STRIP: 0x0005,
    BLEND: 0x0be2,
    FUNC_ADD: 0x8006,
    TEXTURE1: 0x84c1,
    TEXTURE2: 0x84c2,
    TEXTURE3: 0x84c3,
    canvas: { width: 800, height: 600 },
    createShader: vi.fn(() => ({ type: "shader" })),
    createProgram: vi.fn(() => ({ type: "program" })),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    deleteShader: vi.fn(),
    useProgram: vi.fn(),
    deleteProgram: vi.fn(),
    getUniformLocation: vi.fn(() => ({ type: "uniform" })),
    createTexture: vi.fn(() => ({ type: "texture" })),
    bindTexture: vi.fn(),
    deleteTexture: vi.fn(),
    texParameteri: vi.fn(),
    texStorage2D: vi.fn(),
    texSubImage2D: vi.fn(),
    activeTexture: vi.fn(),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    uniform1ui: vi.fn(),
    uniform4f: vi.fn(),
    uniformMatrix3x2fv: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendEquation: vi.fn(),
    blendFuncSeparate: vi.fn(),
    drawArrays: vi.fn(),
  } as unknown as MockGl;
};
describe("WebGLShapesController", () => {
  let mockGl: MockGl;
  beforeEach(() => {
    mockGl = createMockGl();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });
  describe("constructor", () => {
    it("creates shader program with vertex and fragment shaders", () => {
      new WebGLShapesController(mockGl as unknown as WebGL2RenderingContext);
      expect(mockGl.createProgram).toHaveBeenCalled();
      expect(mockGl.createShader).toHaveBeenCalledTimes(2);
    });
    it("gets uniform locations", () => {
      new WebGLShapesController(mockGl as unknown as WebGL2RenderingContext);
      expect(mockGl.getUniformLocation).toHaveBeenCalledWith(
        expect.anything(),
        "u_viewportToWorldMatrix",
      );
      expect(mockGl.getUniformLocation).toHaveBeenCalledWith(
        expect.anything(),
        "u_worldToDataMatrix",
      );
      expect(mockGl.getUniformLocation).toHaveBeenCalledWith(
        expect.anything(),
        "u_strokeWidth",
      );
      expect(mockGl.getUniformLocation).toHaveBeenCalledWith(
        expect.anything(),
        "u_numScanlines",
      );
    });
  });
  describe("setNumScanlines", () => {
    it("returns false when value does not change", () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      // Default is likely from defaultDrawOptions
      const result = controller.setNumScanlines(512);
      expect(result).toBe(false);
    });
    it("returns true when value changes", () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const result = controller.setNumScanlines(1024);
      expect(result).toBe(true);
    });
    it("invalidates existing scanline data textures when value changes", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 1,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  {
                    x: 0,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 10,
                  },
                  {
                    x: 0,
                    y: 10,
                  },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      const deleteTextureCallsBefore = mockGl.deleteTexture.mock.calls.length;
      controller.setNumScanlines(1024);
      const deleteTextureCallsAfter = mockGl.deleteTexture.mock.calls.length;
      expect(deleteTextureCallsAfter).toBeGreaterThan(deleteTextureCallsBefore);
    });
  });
  describe("synchronize", () => {
    it("loads shapes data for matching layers", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 1,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  {
                    x: 0,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 10,
                  },
                  {
                    x: 0,
                    y: 10,
                  },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      expect(loadShapes).toHaveBeenCalledWith("shapes1", expect.any(Object));
    });
    it("skips layers not matching layer config", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer2",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1", // Different layer
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadShapes = vi.fn();
      const loadTable = vi.fn();
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      expect(loadShapes).not.toHaveBeenCalled();
    });
    it("logs error when shapes fail to load", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const loadShapes = vi.fn(async () => {
        throw new Error("Load failed");
      });
      const loadTable = vi.fn();
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load shapes with ID 'shapes1'",
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });
    it("creates scanline data texture", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 1,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  {
                    x: 0,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 10,
                  },
                  {
                    x: 0,
                    y: 10,
                  },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      expect(mockGl.createTexture).toHaveBeenCalled();
      expect(mockShapesData.loadMultiPolygons).toHaveBeenCalled();
    });
    it("handles abort signal during loading", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const abortController = new AbortController();
      abortController.abort();
      const layers = [{ id: "layer1" }];
      const shapes = [{ id: "shapes1", layerConfigs: [{ layer: "layer1" }] }];
      const loadShapes = vi.fn();
      const loadTable = vi.fn();
      await expect(
        controller.synchronize(
          layers as any,
          shapes as any,
          [],
          [],
          [],
          loadShapes,
          loadTable,
          {
            signal: abortController.signal,
          },
        ),
      ).rejects.toThrow();
      expect(loadShapes).not.toHaveBeenCalled();
    });
    it("removes shapes no longer in the state", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 1,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  {
                    x: 0,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 10,
                  },
                  {
                    x: 0,
                    y: 10,
                  },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      // First sync with shapes
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      const deleteTextureCallsBefore = mockGl.deleteTexture.mock.calls.length;
      // Second sync with no shapes
      await controller.synchronize(
        layers as any,
        [],
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      const deleteTextureCallsAfter = mockGl.deleteTexture.mock.calls.length;
      expect(deleteTextureCallsAfter).toBeGreaterThan(deleteTextureCallsBefore);
    });
    it("creates fill and stroke color textures", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 2,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  {
                    x: 0,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 10,
                  },
                  {
                    x: 0,
                    y: 10,
                  },
                ],
                holes: [],
              },
            ],
          },
          {
            polygons: [
              {
                shell: [
                  {
                    x: 20,
                    y: 20,
                  },
                  {
                    x: 30,
                    y: 20,
                  },
                  {
                    x: 30,
                    y: 30,
                  },
                  {
                    x: 20,
                    y: 30,
                  },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      // Should create 3 textures: scanline data, fill colors, stroke colors
      expect(mockGl.createTexture).toHaveBeenCalledTimes(3);
    });

    it("sets fill color to transparent when layer visibility is false", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: false,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 2,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  { x: 0, y: 0 },
                  { x: 10, y: 0 },
                  { x: 10, y: 10 },
                  { x: 0, y: 10 },
                ],
                holes: [],
              },
            ],
          },
          {
            polygons: [
              {
                shell: [
                  { x: 20, y: 20 },
                  { x: 30, y: 20 },
                  { x: 30, y: 30 },
                  { x: 20, y: 30 },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      const texturesBefore = mockGl.createTexture.mock.calls.length;

      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );

      // Textures should still be created even with transparent colors
      const texturesAfter = mockGl.createTexture.mock.calls.length;
      expect(texturesAfter).toBeGreaterThan(texturesBefore);

      // Verify that texSubImage2D was called with all-zero Uint32Array data
      // (transparent fill and stroke colors) for the color textures
      const transparentCalls = mockGl.texSubImage2D.mock.calls.filter(
        (call: unknown[]) =>
          call[8] instanceof Uint32Array &&
          call[8].every((v: number) => v === 0),
      );
      // At least two transparent textures: fill colors and stroke colors
      expect(transparentCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("sets stroke color to transparent when shapes opacity is 0", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 0,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 2,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  { x: 0, y: 0 },
                  { x: 10, y: 0 },
                  { x: 10, y: 10 },
                  { x: 0, y: 10 },
                ],
                holes: [],
              },
            ],
          },
          {
            polygons: [
              {
                shell: [
                  { x: 20, y: 20 },
                  { x: 30, y: 20 },
                  { x: 30, y: 30 },
                  { x: 20, y: 30 },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      const texturesBefore = mockGl.createTexture.mock.calls.length;

      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );

      // Textures should still be created even with transparent colors
      const texturesAfter = mockGl.createTexture.mock.calls.length;
      expect(texturesAfter).toBeGreaterThan(texturesBefore);

      // Verify that texSubImage2D was called with all-zero Uint32Array data
      // (transparent fill and stroke colors) for the color textures
      const transparentCalls = mockGl.texSubImage2D.mock.calls.filter(
        (call: unknown[]) =>
          call[8] instanceof Uint32Array &&
          call[8].every((v: number) => v === 0),
      );
      // At least two transparent textures: fill colors and stroke colors
      expect(transparentCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("handles polygons spanning multiple scanlines", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      controller.setNumScanlines(64);

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 1,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                // Large polygon that spans many scanlines
                shell: [
                  { x: 0, y: 0 },
                  { x: 100, y: 0 },
                  { x: 100, y: 100 },
                  { x: 0, y: 100 },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();

      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );

      // The synchronization should complete successfully
      expect(mockGl.createTexture).toHaveBeenCalled();
      expect(mockShapesData.loadMultiPolygons).toHaveBeenCalled();
    });
  });
  describe("draw", () => {
    it("does not draw when no shapes are synchronized", () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const drawOptions = {
        shapeStrokeWidth: 1,
        numShapesScanlines: 512,
      } as any;
      controller.draw(viewport, drawOptions);
      expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });
    it("uses shader program", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 1,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  {
                    x: 0,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 10,
                  },
                  {
                    x: 0,
                    y: 10,
                  },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const drawOptions = {
        shapeStrokeWidth: 1,
        numShapesScanlines: 512,
      } as any;
      controller.draw(viewport, drawOptions);
      expect(mockGl.useProgram).toHaveBeenCalled();
    });
    it("sets uniforms correctly", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 1,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  {
                    x: 0,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 10,
                  },
                  {
                    x: 0,
                    y: 10,
                  },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      const viewport = { x: 10, y: 20, width: 100, height: 50 };
      const drawOptions = {
        shapeStrokeWidth: 2,
        numShapesScanlines: 512,
      } as any;
      controller.draw(viewport, drawOptions);
      expect(mockGl.uniform1f).toHaveBeenCalledWith(expect.anything(), 2);
      expect(mockGl.uniform1ui).toHaveBeenCalledWith(expect.anything(), 512);
    });
    it("binds textures for each shape", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 1,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  {
                    x: 0,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 10,
                  },
                  {
                    x: 0,
                    y: 10,
                  },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const drawOptions = {
        shapeStrokeWidth: 1,
        numShapesScanlines: 512,
      } as any;
      controller.draw(viewport, drawOptions);
      expect(mockGl.activeTexture).toHaveBeenCalledWith(mockGl.TEXTURE1);
      expect(mockGl.activeTexture).toHaveBeenCalledWith(mockGl.TEXTURE2);
      expect(mockGl.activeTexture).toHaveBeenCalledWith(mockGl.TEXTURE3);
      expect(mockGl.bindTexture).toHaveBeenCalled();
    });
    it("enables alpha blending", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 1,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  {
                    x: 0,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 10,
                  },
                  {
                    x: 0,
                    y: 10,
                  },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const drawOptions = {
        shapeStrokeWidth: 1,
        numShapesScanlines: 512,
      } as any;
      controller.draw(viewport, drawOptions);
      expect(mockGl.enable).toHaveBeenCalledWith(mockGl.BLEND);
      expect(mockGl.blendEquation).toHaveBeenCalledWith(mockGl.FUNC_ADD);
    });
    it("draws using gl.TRIANGLE_STRIP primitive", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 1,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  {
                    x: 0,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 10,
                  },
                  {
                    x: 0,
                    y: 10,
                  },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const drawOptions = {
        shapeStrokeWidth: 1,
        numShapesScanlines: 512,
      } as any;
      controller.draw(viewport, drawOptions);
      expect(mockGl.drawArrays).toHaveBeenCalledWith(
        mockGl.TRIANGLE_STRIP,
        0,
        4,
      );
    });
    it("skips shapes with undefined scanline data texture", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 1,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  {
                    x: 0,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 10,
                  },
                  {
                    x: 0,
                    y: 10,
                  },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      // Invalidate scanline data texture
      controller.setNumScanlines(1024);
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const drawOptions = {
        shapeStrokeWidth: 1,
        numShapesScanlines: 1024,
      } as any;
      controller.draw(viewport, drawOptions);
      // Should not draw since scanline data texture is invalidated
      expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });
    it("handles polygon with degenerate edges (zero-length)", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 1,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  {
                    x: 0,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 10,
                  }, // This and the next vertex are the same
                  {
                    x: 10,
                    y: 10,
                  }, // Zero-length edge
                  {
                    x: 0,
                    y: 10,
                  },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const drawOptions = {
        shapeStrokeWidth: 1,
        numShapesScanlines: 512,
      } as any;
      controller.draw(viewport, drawOptions);
      // Should still draw, just skipping zero-length edges
      expect(mockGl.drawArrays).toHaveBeenCalled();
    });
  });
  describe("destroy", () => {
    it("deletes shader program", () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      controller.destroy();
      expect(mockGl.deleteProgram).toHaveBeenCalled();
    });
    it("deletes all textures from shapes", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 1,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  {
                    x: 0,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 10,
                  },
                  {
                    x: 0,
                    y: 10,
                  },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      controller.destroy();
      // Should delete 3 textures: scanline data, fill colors, stroke colors
      expect(mockGl.deleteTexture).toHaveBeenCalledTimes(3);
    });
    it("clears shapes list", async () => {
      const controller = new WebGLShapesController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
        },
      ];
      const shapes = [
        {
          id: "shapes1",
          visibility: true,
          opacity: 1,
          shapeFillColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          shapeFillVisibility: { constant: { value: true } },
          shapeFillOpacity: { constant: { opacity: 1 } },
          shapeStrokeColor: { constant: { value: { r: 0, g: 0, b: 0 } } },
          shapeStrokeVisibility: { constant: { value: true } },
          shapeStrokeOpacity: { constant: { opacity: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              transform: {
                translation: { x: 0, y: 0 },
                rotation: 0,
                scale: 1,
              },
              flip: false,
            },
          ],
        },
      ];
      const mockShapesData = {
        getLength: () => 1,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadMultiPolygons: vi.fn(async () => [
          {
            polygons: [
              {
                shell: [
                  {
                    x: 0,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 0,
                  },
                  {
                    x: 10,
                    y: 10,
                  },
                  {
                    x: 0,
                    y: 10,
                  },
                ],
                holes: [],
              },
            ],
          },
        ]),
        destroy: vi.fn(),
      };
      const loadShapes = vi.fn(async () => mockShapesData);
      const loadTable = vi.fn();
      await controller.synchronize(
        layers as any,
        shapes as any,
        [],
        [],
        [],
        loadShapes,
        loadTable,
      );
      controller.destroy();
      // After destroy, drawing should do nothing
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const drawOptions = {
        shapeStrokeWidth: 1,
        numShapesScanlines: 512,
      } as any;
      controller.draw(viewport, drawOptions);
      expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });
  });
});

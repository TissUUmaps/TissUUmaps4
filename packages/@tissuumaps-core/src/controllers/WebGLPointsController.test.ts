/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Marker } from "../model/types";
import { WebGLPointsController } from "./WebGLPointsController";

// Mock markers.png import
vi.mock("../assets/markers/markers.png?url", () => ({
  default: "/mocked-markers.png",
}));

// Mock shaders
vi.mock("../assets/shaders/points.frag?raw", () => ({
  default: "fragment shader source",
}));

vi.mock("../assets/shaders/points.vert?raw", () => ({
  default: "vertex shader source",
}));

type MockGl = {
  VERTEX_SHADER: number;
  FRAGMENT_SHADER: number;
  ARRAY_BUFFER: number;
  UNIFORM_BUFFER: number;
  STATIC_DRAW: number;
  DYNAMIC_DRAW: number;
  FLOAT: number;
  UNSIGNED_INT: number;
  UNSIGNED_BYTE: number;
  UNSIGNED_SHORT: number;
  TEXTURE_2D: number;
  POINTS: number;
  COLOR_BUFFER_BIT: number;
  BLEND: number;
  FUNC_ADD: number;
  ONE: number;
  ONE_MINUS_SRC_ALPHA: number;
  TEXTURE0: number;
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
  getUniformBlockIndex: ReturnType<typeof vi.fn>;
  createBuffer: ReturnType<typeof vi.fn>;
  bindBuffer: ReturnType<typeof vi.fn>;
  bufferData: ReturnType<typeof vi.fn>;
  bufferSubData: ReturnType<typeof vi.fn>;
  deleteBuffer: ReturnType<typeof vi.fn>;
  createVertexArray: ReturnType<typeof vi.fn>;
  bindVertexArray: ReturnType<typeof vi.fn>;
  deleteVertexArray: ReturnType<typeof vi.fn>;
  enableVertexAttribArray: ReturnType<typeof vi.fn>;
  vertexAttribPointer: ReturnType<typeof vi.fn>;
  vertexAttribIPointer: ReturnType<typeof vi.fn>;
  vertexAttribDivisor: ReturnType<typeof vi.fn>;
  createTexture: ReturnType<typeof vi.fn>;
  bindTexture: ReturnType<typeof vi.fn>;
  deleteTexture: ReturnType<typeof vi.fn>;
  texParameteri: ReturnType<typeof vi.fn>;
  texImage2D: ReturnType<typeof vi.fn>;
  generateMipmap: ReturnType<typeof vi.fn>;
  activeTexture: ReturnType<typeof vi.fn>;
  uniform1f: ReturnType<typeof vi.fn>;
  uniform2f: ReturnType<typeof vi.fn>;
  uniform1i: ReturnType<typeof vi.fn>;
  uniformMatrix3x2fv: ReturnType<typeof vi.fn>;
  bindBufferBase: ReturnType<typeof vi.fn>;
  uniformBlockBinding: ReturnType<typeof vi.fn>;
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
    ARRAY_BUFFER: 0x8892,
    UNIFORM_BUFFER: 0x8a11,
    STATIC_DRAW: 0x88e4,
    DYNAMIC_DRAW: 0x88e8,
    FLOAT: 0x1406,
    UNSIGNED_INT: 0x1405,
    UNSIGNED_BYTE: 0x1401,
    UNSIGNED_SHORT: 0x1403,
    TEXTURE_2D: 0x0de1,
    POINTS: 0x0000,
    COLOR_BUFFER_BIT: 0x00004000,
    BLEND: 0x0be2,
    FUNC_ADD: 0x8006,
    ONE: 1,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    TEXTURE0: 0x84c0,
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
    getUniformBlockIndex: vi.fn(() => 0),
    createBuffer: vi.fn(() => ({ type: "buffer" })),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    bufferSubData: vi.fn(),
    deleteBuffer: vi.fn(),
    createVertexArray: vi.fn(() => ({ type: "vao" })),
    bindVertexArray: vi.fn(),
    deleteVertexArray: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    vertexAttribIPointer: vi.fn(),
    vertexAttribDivisor: vi.fn(),
    createTexture: vi.fn(() => ({ type: "texture" })),
    bindTexture: vi.fn(),
    deleteTexture: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D: vi.fn(),
    generateMipmap: vi.fn(),
    activeTexture: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform1i: vi.fn(),
    uniformMatrix3x2fv: vi.fn(),
    bindBufferBase: vi.fn(),
    uniformBlockBinding: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    blendEquation: vi.fn(),
    blendFuncSeparate: vi.fn(),
    drawArrays: vi.fn(),
  } as unknown as MockGl;
};

describe("WebGLPointsController", () => {
  let mockGl: MockGl;

  beforeEach(() => {
    mockGl = createMockGl();
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = "";
      constructor() {
        setTimeout(() => this.onload?.(), 0);
      }
    } as any;
    global.window = { devicePixelRatio: 1 } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("creates shader program with vertex and fragment shaders", () => {
      new WebGLPointsController(mockGl as unknown as WebGL2RenderingContext);

      expect(mockGl.createProgram).toHaveBeenCalled();
      expect(mockGl.createShader).toHaveBeenCalledTimes(2);
    });

    it("gets uniform locations", () => {
      new WebGLPointsController(mockGl as unknown as WebGL2RenderingContext);

      expect(mockGl.getUniformLocation).toHaveBeenCalledWith(
        expect.anything(),
        "u_worldPointSizeFactor",
      );
      expect(mockGl.getUniformLocation).toHaveBeenCalledWith(
        expect.anything(),
        "u_worldToViewportMatrix",
      );
      expect(mockGl.getUniformLocation).toHaveBeenCalledWith(
        expect.anything(),
        "u_viewportSize",
      );
    });

    it("gets uniform block indices", () => {
      new WebGLPointsController(mockGl as unknown as WebGL2RenderingContext);

      expect(mockGl.getUniformBlockIndex).toHaveBeenCalledWith(
        expect.anything(),
        "ObjectsUBO",
      );
    });

    it("creates all required buffers", () => {
      new WebGLPointsController(mockGl as unknown as WebGL2RenderingContext);

      // 7 buffers: x, y, size, color, marker, object, objectsUBO
      expect(mockGl.createBuffer).toHaveBeenCalledTimes(7);
    });

    it("creates and configures VAO", () => {
      new WebGLPointsController(mockGl as unknown as WebGL2RenderingContext);

      expect(mockGl.createVertexArray).toHaveBeenCalled();
      expect(mockGl.bindVertexArray).toHaveBeenCalled();
    });

    it("configures vertex attributes", () => {
      new WebGLPointsController(mockGl as unknown as WebGL2RenderingContext);

      expect(mockGl.enableVertexAttribArray).toHaveBeenCalled();
      expect(mockGl.vertexAttribPointer).toHaveBeenCalled();
      expect(mockGl.vertexAttribIPointer).toHaveBeenCalled();
    });

    it("allocates space for objects UBO", () => {
      new WebGLPointsController(mockGl as unknown as WebGL2RenderingContext);

      // Check that bufferData was called for the UBO with correct size
      const uboCall = (mockGl.bufferData as any).mock.calls.find(
        (call: any[]) => call[0] === mockGl.UNIFORM_BUFFER,
      );
      expect(uboCall).toBeDefined();
      // bufferData can be called with a size number
      expect(
        typeof uboCall[1] === "number" || uboCall[1] instanceof ArrayBuffer,
      ).toBe(true);
      expect(uboCall[2]).toBe(mockGl.DYNAMIC_DRAW);
    });
  });

  describe("initialize", () => {
    it("loads marker atlas texture", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );

      await controller.initialize();

      expect(mockGl.createTexture).toHaveBeenCalled();
      expect(mockGl.bindTexture).toHaveBeenCalled();
      expect(mockGl.generateMipmap).toHaveBeenCalled();
    });

    it("returns controller instance for chaining", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );

      const result = await controller.initialize();

      expect(result).toBe(controller);
    });

    it("handles abort signal", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      const abortController = new AbortController();
      abortController.abort();

      await expect(
        controller.initialize({ signal: abortController.signal }),
      ).rejects.toThrow();
    });
  });

  describe("synchronize", () => {
    it("loads points data for matching layers", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: { constant: { value: 5 } },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const mockPointsData = {
        getLength: () => 10,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadCoordinates: vi.fn(async () => new Float32Array(10)),
        suggestDimensionQueries: vi.fn(async () => []),
        getDimension: vi.fn(async () => null),
        destroy: vi.fn(),
      };

      const loadPoints = vi.fn(async () => mockPointsData);
      const loadTable = vi.fn();

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      expect(loadPoints).toHaveBeenCalledWith("points1", expect.any(Object));
    });

    it("skips layers not matching layer config", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();

      const layers = [
        {
          id: "layer2",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: { constant: { value: 5 } },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1", // Different layer
              x: "data",
              y: "data",
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

      const loadPoints = vi.fn();
      const loadTable = vi.fn();

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      expect(loadPoints).not.toHaveBeenCalled();
    });

    it("logs error when points fail to load", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: { constant: { value: 5 } },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const loadPoints = vi.fn(async () => {
        throw new Error("Load failed");
      });
      const loadTable = vi.fn();

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load points with ID 'points1'",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("does not log error when aborted", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: { constant: { value: 5 } },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const abortController = new AbortController();
      const loadPoints = vi.fn(async () => {
        abortController.abort();
        throw new Error("Aborted");
      });
      const loadTable = vi.fn();

      await expect(
        controller.synchronize(
          layers as any,
          points as any,
          [],
          [],
          [],
          [],
          [],
          loadPoints,
          loadTable,
          { signal: abortController.signal },
        ),
      ).rejects.toThrow();

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("warns when exceeding max number of objects", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];

      // Create 2049 points objects (exceeds max of 2048)
      const points = Array.from({ length: 2049 }, (_, i) => ({
        id: `points${i}`,
        visibility: true,
        opacity: 1,
        pointSizeFactor: 1,
        pointMarker: { constant: { value: Marker.Disc } },
        pointSize: { constant: { value: 5 } },
        pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
        pointVisibility: { constant: { value: true } },
        pointOpacity: { constant: { value: 1 } },
        layerConfigs: [
          {
            layer: "layer1",
            x: "data",
            y: "data",
            transform: {
              translation: { x: 0, y: 0 },
              rotation: 0,
              scale: 1,
            },
            flip: false,
          },
        ],
      }));

      const mockPointsData = {
        getLength: () => 1,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadCoordinates: vi.fn(async () => new Float32Array(1)),
        suggestDimensionQueries: vi.fn(async () => []),
        getDimension: vi.fn(async () => null),
        destroy: vi.fn(),
      };

      const loadPoints = vi.fn(async () => mockPointsData);
      const loadTable = vi.fn();

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Only rendering the first 2048 out of 2049"),
      );

      consoleWarnSpy.mockRestore();
    });

    it("resizes buffers when point count changes", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: { constant: { value: 5 } },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const mockPointsData = {
        getLength: () => 10,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadCoordinates: vi.fn(async () => new Float32Array(10)),
        suggestDimensionQueries: vi.fn(async () => []),
        getDimension: vi.fn(async () => null),
        destroy: vi.fn(),
      };

      const loadPoints = vi.fn(async () => mockPointsData);
      const loadTable = vi.fn();

      const bufferDataCallsBefore = mockGl.bufferData.mock.calls.length;

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      const bufferDataCallsAfter = mockGl.bufferData.mock.calls.length;
      expect(bufferDataCallsAfter).toBeGreaterThan(bufferDataCallsBefore);
    });

    it("uploads coordinate data to GPU buffers", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: { constant: { value: 5 } },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const mockPointsData = {
        getLength: () => 5,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadCoordinates: vi.fn(async () => new Float32Array([1, 2, 3, 4, 5])),
        suggestDimensionQueries: vi.fn(async () => []),
        getDimension: vi.fn(async () => null),
        destroy: vi.fn(),
      };

      const loadPoints = vi.fn(async () => mockPointsData);
      const loadTable = vi.fn();

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      expect(mockPointsData.loadCoordinates).toHaveBeenCalledWith(
        "data",
        expect.any(Object),
      );
    });

    it("handles pointSize from config with unit", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: {
            from: { table: "table1", column: "size", unit: "data" },
          },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const mockPointsData = {
        getLength: () => 5,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadCoordinates: vi.fn(async () => new Float32Array([1, 2, 3, 4, 5])),
        suggestDimensionQueries: vi.fn(async () => []),
        getDimension: vi.fn(async () => null),
        destroy: vi.fn(),
      };

      const loadPoints = vi.fn(async () => mockPointsData);
      const mockTableData = {
        getLength: () => 5,
        getIndex: vi.fn(() => [0, 1, 2, 3, 4]),
        loadColumn: vi.fn(async () => new Float32Array([1, 2, 3, 4, 5])) as any,
        suggestColumnQueries: vi.fn(async () => []),
        getColumn: vi.fn(async () => null) as any,
        destroy: vi.fn(),
      };
      const loadTable = vi.fn(async () => mockTableData) as any;

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      expect(mockGl.bufferData).toHaveBeenCalled();
      expect(loadTable).toHaveBeenCalled();
    });

    it("handles pointSize groupBy config with unit", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: {
            groupBy: {
              table: "table1",
              column: "category",
              map: "sizeMap",
              unit: "layer",
            },
          },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const mockPointsData = {
        getLength: () => 5,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadCoordinates: vi.fn(async () => new Float32Array([1, 2, 3, 4, 5])),
        suggestDimensionQueries: vi.fn(async () => []),
        getDimension: vi.fn(async () => null),
        destroy: vi.fn(),
      };

      const loadPoints = vi.fn(async () => mockPointsData);
      const mockTableData = {
        getLength: () => 5,
        getIndex: vi.fn(() => [0, 1, 2, 3, 4]),
        loadColumn: vi.fn(async () => ["A", "A", "A", "A", "A"]) as any,
        suggestColumnQueries: vi.fn(async () => []),
        getColumn: vi.fn(async () => null) as any,
        destroy: vi.fn(),
      };
      const loadTable = vi.fn(async () => mockTableData) as any;

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [{ id: "sizeMap", name: "Size Map", values: { A: 5 } }],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      expect(mockGl.bufferData).toHaveBeenCalled();
    });

    it("sets color to transparent when layer visibility is false", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: false,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: { constant: { value: 5 } },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const mockPointsData = {
        getLength: () => 5,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadCoordinates: vi.fn(async () => new Float32Array([1, 2, 3, 4, 5])),
        suggestDimensionQueries: vi.fn(async () => []),
        getDimension: vi.fn(async () => null),
        destroy: vi.fn(),
      };

      const loadPoints = vi.fn(async () => mockPointsData);
      const loadTable = vi.fn();
      mockGl.bufferSubData.mockClear();

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      // Find the bufferSubData call for the color buffer (should be all zeros)
      const colorBufferCall = mockGl.bufferSubData.mock.calls.find(
        (call) => call[2] instanceof Uint32Array && call[2].length > 0,
      );
      expect(colorBufferCall).toBeDefined();
      expect(colorBufferCall![2]).toEqual(new Uint32Array(5).fill(0));
    });

    it("sets color to transparent when points opacity is 0", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 0,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: { constant: { value: 5 } },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const mockPointsData = {
        getLength: () => 5,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadCoordinates: vi.fn(async () => new Float32Array([1, 2, 3, 4, 5])),
        suggestDimensionQueries: vi.fn(async () => []),
        getDimension: vi.fn(async () => null),
        destroy: vi.fn(),
      };

      const loadPoints = vi.fn(async () => mockPointsData);
      const loadTable = vi.fn();
      mockGl.bufferSubData.mockClear();

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      // Find the bufferSubData call for the color buffer (should be all zeros)
      const colorBufferCall = mockGl.bufferSubData.mock.calls.find(
        (call) => call[2] instanceof Uint32Array && call[2].length > 0,
      );
      expect(colorBufferCall).toBeDefined();
      expect(colorBufferCall![2]).toEqual(new Uint32Array(5).fill(0));
    });
  });

  describe("draw", () => {
    it("does not draw when buffer is empty", () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );

      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const drawOptions = { pointSizeFactor: 1 } as any;

      controller.draw(viewport, drawOptions);

      expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });

    it("does not draw when marker atlas is not loaded", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: { constant: { value: 5 } },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const mockPointsData = {
        getLength: () => 5,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadCoordinates: vi.fn(async () => new Float32Array(5)),
        suggestDimensionQueries: vi.fn(async () => []),
        getDimension: vi.fn(async () => null),
        destroy: vi.fn(),
      };

      const loadPoints = vi.fn(async () => mockPointsData);
      const loadTable = vi.fn();

      // Synchronize without initializing
      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const drawOptions = { pointSizeFactor: 1 } as any;

      controller.draw(viewport, drawOptions);

      expect(mockGl.drawArrays).not.toHaveBeenCalled();
    });

    it("uses shader program and VAO", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: { constant: { value: 5 } },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const mockPointsData = {
        getLength: () => 5,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadCoordinates: vi.fn(async () => new Float32Array(5)),
        suggestDimensionQueries: vi.fn(async () => []),
        getDimension: vi.fn(async () => null),
        destroy: vi.fn(),
      };

      const loadPoints = vi.fn(async () => mockPointsData);
      const loadTable = vi.fn();

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const drawOptions = { pointSizeFactor: 1 } as any;

      controller.draw(viewport, drawOptions);

      expect(mockGl.useProgram).toHaveBeenCalled();
      expect(mockGl.bindVertexArray).toHaveBeenCalled();
    });

    it("sets uniforms correctly", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: { constant: { value: 5 } },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const mockPointsData = {
        getLength: () => 5,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadCoordinates: vi.fn(async () => new Float32Array(5)),
        suggestDimensionQueries: vi.fn(async () => []),
        getDimension: vi.fn(async () => null),
        destroy: vi.fn(),
      };

      const loadPoints = vi.fn(async () => mockPointsData);
      const loadTable = vi.fn();

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      const viewport = { x: 10, y: 20, width: 100, height: 50 };
      const drawOptions = { pointSizeFactor: 2 } as any;

      controller.draw(viewport, drawOptions);

      expect(mockGl.uniform1f).toHaveBeenCalledWith(expect.anything(), 2);
      expect(mockGl.uniform2f).toHaveBeenCalledWith(expect.anything(), 100, 50);
      expect(mockGl.uniform2f).toHaveBeenCalledWith(
        expect.anything(),
        800,
        600,
      );
    });

    it("binds marker atlas texture", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: { constant: { value: 5 } },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const mockPointsData = {
        getLength: () => 5,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadCoordinates: vi.fn(async () => new Float32Array(5)),
        suggestDimensionQueries: vi.fn(async () => []),
        getDimension: vi.fn(async () => null),
        destroy: vi.fn(),
      };

      const loadPoints = vi.fn(async () => mockPointsData);
      const loadTable = vi.fn();

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const drawOptions = { pointSizeFactor: 1 } as any;

      controller.draw(viewport, drawOptions);

      expect(mockGl.activeTexture).toHaveBeenCalledWith(mockGl.TEXTURE0);
      expect(mockGl.bindTexture).toHaveBeenCalledWith(
        mockGl.TEXTURE_2D,
        expect.anything(),
      );
    });

    it("enables alpha blending", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: { constant: { value: 5 } },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const mockPointsData = {
        getLength: () => 5,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadCoordinates: vi.fn(async () => new Float32Array(5)),
        suggestDimensionQueries: vi.fn(async () => []),
        getDimension: vi.fn(async () => null),
        destroy: vi.fn(),
      };

      const loadPoints = vi.fn(async () => mockPointsData);
      const loadTable = vi.fn();

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const drawOptions = { pointSizeFactor: 1 } as any;

      controller.draw(viewport, drawOptions);

      expect(mockGl.enable).toHaveBeenCalledWith(mockGl.BLEND);
      expect(mockGl.blendEquation).toHaveBeenCalledWith(mockGl.FUNC_ADD);
    });

    it("draws using gl.POINTS primitive", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: { constant: { value: 5 } },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const mockPointsData = {
        getLength: () => 5,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadCoordinates: vi.fn(async () => new Float32Array(5)),
        suggestDimensionQueries: vi.fn(async () => []),
        getDimension: vi.fn(async () => null),
        destroy: vi.fn(),
      };

      const loadPoints = vi.fn(async () => mockPointsData);
      const loadTable = vi.fn();

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const drawOptions = { pointSizeFactor: 1 } as any;

      controller.draw(viewport, drawOptions);

      expect(mockGl.drawArrays).toHaveBeenCalledWith(mockGl.POINTS, 0, 5);
    });

    it("disables alpha blending after drawing", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();

      const layers = [
        {
          id: "layer1",
          transform: { translation: { x: 0, y: 0 }, rotation: 0, scale: 1 },
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
        },
      ];
      const points = [
        {
          id: "points1",
          visibility: true,
          opacity: 1,
          pointSizeFactor: 1,
          pointMarker: { constant: { value: Marker.Disc } },
          pointSize: { constant: { value: 5 } },
          pointColor: { constant: { value: { r: 255, g: 0, b: 0 } } },
          pointVisibility: { constant: { value: true } },
          pointOpacity: { constant: { value: 1 } },
          layerConfigs: [
            {
              layer: "layer1",
              x: "data",
              y: "data",
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

      const mockPointsData = {
        getLength: () => 5,
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-return */
        getIndex: () => [] as any,
        loadCoordinates: vi.fn(async () => new Float32Array(5)),
        suggestDimensionQueries: vi.fn(async () => []),
        getDimension: vi.fn(async () => null),
        destroy: vi.fn(),
      };

      const loadPoints = vi.fn(async () => mockPointsData);
      const loadTable = vi.fn();

      await controller.synchronize(
        layers as any,
        points as any,
        [],
        [],
        [],
        [],
        [],
        loadPoints,
        loadTable,
      );

      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const drawOptions = { pointSizeFactor: 1 } as any;

      controller.draw(viewport, drawOptions);

      expect(mockGl.disable).toHaveBeenCalledWith(mockGl.BLEND);
    });
  });

  describe("destroy", () => {
    it("deletes shader program", () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );

      controller.destroy();

      expect(mockGl.deleteProgram).toHaveBeenCalled();
    });

    it("deletes VAO", () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );

      controller.destroy();

      expect(mockGl.deleteVertexArray).toHaveBeenCalled();
    });

    it("deletes marker atlas texture if loaded", async () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );
      await controller.initialize();

      controller.destroy();

      expect(mockGl.deleteTexture).toHaveBeenCalled();
    });

    it("does not delete texture if not loaded", () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );

      controller.destroy();

      expect(mockGl.deleteTexture).not.toHaveBeenCalled();
    });

    it("deletes all buffers", () => {
      const controller = new WebGLPointsController(
        mockGl as unknown as WebGL2RenderingContext,
      );

      controller.destroy();

      // 7 buffers: x, y, size, color, marker, object, objectsUBO
      expect(mockGl.deleteBuffer).toHaveBeenCalledTimes(7);
    });
  });
});

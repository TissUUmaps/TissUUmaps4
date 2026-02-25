/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/unbound-method */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WebGLController } from "./WebGLController";
import { WebGLPointsController } from "./WebGLPointsController";
import { WebGLShapesController } from "./WebGLShapesController";

// Mock the sub-controllers
vi.mock("./WebGLPointsController");
vi.mock("./WebGLShapesController");

// Mock shaders (used by sub-controllers)
vi.mock("../assets/shaders/points.frag?raw", () => ({
  default: "fragment shader source",
}));

vi.mock("../assets/shaders/points.vert?raw", () => ({
  default: "vertex shader source",
}));

vi.mock("../assets/shaders/shapes.frag?raw", () => ({
  default: "fragment shader source",
}));

vi.mock("../assets/shaders/shapes.vert?raw", () => ({
  default: "vertex shader source",
}));

vi.mock("../assets/markers/markers.png?url", () => ({
  default: "/mocked-markers.png",
}));

type MockGl = {
  VERTEX_SHADER: number;
  FRAGMENT_SHADER: number;
  canvas: HTMLCanvasElement;
  clearColor: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  COLOR_BUFFER_BIT: number;
  viewport: ReturnType<typeof vi.fn>;
  createShader: ReturnType<typeof vi.fn>;
  createProgram: ReturnType<typeof vi.fn>;
  shaderSource: ReturnType<typeof vi.fn>;
  compileShader: ReturnType<typeof vi.fn>;
  attachShader: ReturnType<typeof vi.fn>;
  linkProgram: ReturnType<typeof vi.fn>;
  getProgramParameter: ReturnType<typeof vi.fn>;
  deleteShader: ReturnType<typeof vi.fn>;
  getUniformLocation: ReturnType<typeof vi.fn>;
  getUniformBlockIndex: ReturnType<typeof vi.fn>;
  createBuffer: ReturnType<typeof vi.fn>;
  bindBuffer: ReturnType<typeof vi.fn>;
  bufferData: ReturnType<typeof vi.fn>;
  createVertexArray: ReturnType<typeof vi.fn>;
  bindVertexArray: ReturnType<typeof vi.fn>;
  enableVertexAttribArray: ReturnType<typeof vi.fn>;
  vertexAttribPointer: ReturnType<typeof vi.fn>;
  vertexAttribIPointer: ReturnType<typeof vi.fn>;
};

const createMockGl = (canvas: HTMLCanvasElement): MockGl => {
  return {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COLOR_BUFFER_BIT: 0x00004000,
    canvas,
    clearColor: vi.fn(),
    clear: vi.fn(),
    viewport: vi.fn(),
    createShader: vi.fn(() => ({ type: "shader" })),
    createProgram: vi.fn(() => ({ type: "program" })),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    deleteShader: vi.fn(),
    getUniformLocation: vi.fn(() => ({ type: "uniform" })),
    getUniformBlockIndex: vi.fn(() => 0),
    createBuffer: vi.fn(() => ({ type: "buffer" })),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    createVertexArray: vi.fn(() => ({ type: "vao" })),
    bindVertexArray: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    vertexAttribIPointer: vi.fn(),
  } as unknown as MockGl;
};

describe("WebGLController", () => {
  let mockCanvas: HTMLCanvasElement;
  let mockGl: MockGl;

  beforeEach(() => {
    // Create style object that mimics CSSStyleDeclaration
    const styleObject: any = {
      position: "",
      width: "",
      height: "",
      "z-index": "",
    };
    styleObject.setProperty = vi.fn((prop: string, value: string) => {
      styleObject[prop] = value;
    });

    mockCanvas = {
      width: 800,
      height: 600,
      getContext: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      style: styleObject,
    } as unknown as HTMLCanvasElement;

    mockGl = createMockGl(mockCanvas);
    mockCanvas.getContext = vi
      .fn()
      .mockImplementation((contextId: string) =>
        contextId === "webgl2"
          ? (mockGl as unknown as WebGL2RenderingContext)
          : null,
      ) as any;

    global.window = { devicePixelRatio: 1 } as any;
    global.document = {
      createElement: vi.fn(() => mockCanvas),
    } as any;

    // Reset mocks for sub-controllers
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("static createCanvas", () => {
    it("creates a canvas element", () => {
      const canvas = WebGLController.createCanvas();

      expect(global.document.createElement).toHaveBeenCalledWith("canvas");
      expect(canvas).toBe(mockCanvas);
    });

    it("sets canvas style properties", () => {
      const canvas = WebGLController.createCanvas();

      expect(canvas.style.position).toBe("relative");
      expect(canvas.style.width).toBe("100%");
      expect(canvas.style.height).toBe("100%");
      expect((canvas.style as any)["z-index"]).toBe("50");
    });
  });

  describe("constructor", () => {
    it("creates WebGL2 context with correct options", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };

      new WebGLController(mockCanvas, viewport);

      expect(mockCanvas.getContext).toHaveBeenCalledWith("webgl2", {
        antialias: false,
        preserveDrawingBuffer: true,
      });
    });

    it("creates points and shapes sub-controllers", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };

      new WebGLController(mockCanvas, viewport);

      expect(WebGLPointsController).toHaveBeenCalledWith(mockGl);
      expect(WebGLShapesController).toHaveBeenCalledWith(mockGl);
    });

    it("adds webglcontextlost event listener", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };

      new WebGLController(mockCanvas, viewport);

      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        "webglcontextlost",
        expect.any(Function),
      );
    });

    it("adds webglcontextrestored event listener", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };

      new WebGLController(mockCanvas, viewport);

      expect(mockCanvas.addEventListener).toHaveBeenCalledWith(
        "webglcontextrestored",
        expect.any(Function),
      );
    });

    it("prevents default on webglcontextlost event", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };

      new WebGLController(mockCanvas, viewport);

      const listener = (mockCanvas.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === "webglcontextlost",
      )?.[1];

      const event = { preventDefault: vi.fn() };
      listener(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("recreates context and sub-controllers on webglcontextrestored", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };

      new WebGLController(mockCanvas, viewport);

      const listener = (mockCanvas.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === "webglcontextrestored",
      )?.[1];

      expect(listener).toBeDefined();

      vi.clearAllMocks();
      listener();

      expect(mockCanvas.getContext).toHaveBeenCalled();
      expect(WebGLPointsController).toHaveBeenCalled();
      expect(WebGLShapesController).toHaveBeenCalled();
    });
  });

  describe("setViewport", () => {
    it("returns true when viewport changes", () => {
      const initialViewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, initialViewport);

      const newViewport = { x: 10, y: 20, width: 200, height: 150 };
      const result = controller.setViewport(newViewport);

      expect(result).toBe(true);
    });

    it("returns false when viewport does not change", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      const result = controller.setViewport(viewport);

      expect(result).toBe(false);
    });

    it.each([
      {
        description: "x coordinate changes",
        change: (v: any) => ({ ...v, x: 10 }),
      },
      {
        description: "y coordinate changes",
        change: (v: any) => ({ ...v, y: 20 }),
      },
      {
        description: "width changes",
        change: (v: any) => ({ ...v, width: 200 }),
      },
      {
        description: "height changes",
        change: (v: any) => ({ ...v, height: 150 }),
      },
    ])("detects change when $description", ({ change }) => {
      const initialViewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, initialViewport);

      const newViewport = change(initialViewport);
      const result = controller.setViewport(newViewport);

      expect(result).toBe(true);
    });
  });

  describe("setDrawOptions", () => {
    it("calls setNumScanlines on shapes controller", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      const mockShapesController = (WebGLShapesController as any).mock
        .instances[0];
      mockShapesController.setNumScanlines = vi.fn(() => false);

      const drawOptions = { numShapesScanlines: 1024 } as any;
      controller.setDrawOptions(drawOptions);

      expect(mockShapesController.setNumScanlines).toHaveBeenCalledWith(1024);
    });

    it("returns sync flags based on shapes controller response", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      const mockShapesController = (WebGLShapesController as any).mock
        .instances[0];
      mockShapesController.setNumScanlines = vi.fn(() => true);

      const drawOptions = { numShapesScanlines: 1024 } as any;
      const result = controller.setDrawOptions(drawOptions);

      expect(result).toEqual({ syncPoints: false, syncShapes: true });
    });

    it("returns syncShapes false when scanlines do not change", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      const mockShapesController = (WebGLShapesController as any).mock
        .instances[0];
      mockShapesController.setNumScanlines = vi.fn(() => false);

      const drawOptions = { numShapesScanlines: 512 } as any;
      const result = controller.setDrawOptions(drawOptions);

      expect(result).toEqual({ syncPoints: false, syncShapes: false });
    });
  });

  describe("initialize", () => {
    it("calls initialize on points controller", async () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      const mockPointsController = (WebGLPointsController as any).mock
        .instances[0];
      mockPointsController.initialize = vi.fn(async () => mockPointsController);

      await controller.initialize();

      expect(mockPointsController.initialize).toHaveBeenCalledWith({
        signal: undefined,
      });
    });

    it("returns controller instance for chaining", async () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      const mockPointsController = (WebGLPointsController as any).mock
        .instances[0];
      mockPointsController.initialize = vi.fn(async () => mockPointsController);

      const result = await controller.initialize();

      expect(result).toBe(controller);
    });

    it("handles abort signal", async () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      const mockPointsController = (WebGLPointsController as any).mock
        .instances[0];
      mockPointsController.initialize = vi.fn(async () => {
        throw new Error("Aborted");
      });

      const abortController = new AbortController();
      abortController.abort();

      await expect(
        controller.initialize({ signal: abortController.signal }),
      ).rejects.toThrow();
    });

    it("passes abort signal to points controller", async () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      const mockPointsController = (WebGLPointsController as any).mock
        .instances[0];
      mockPointsController.initialize = vi.fn(async () => mockPointsController);

      const abortController = new AbortController();
      await controller.initialize({ signal: abortController.signal });

      expect(mockPointsController.initialize).toHaveBeenCalledWith({
        signal: abortController.signal,
      });
    });
  });

  describe("synchronizePoints", () => {
    it("delegates to points controller", async () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      const mockPointsController = (WebGLPointsController as any).mock
        .instances[0];
      mockPointsController.synchronize = vi.fn(async () => {});

      const [arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9] = [
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        vi.fn(),
        vi.fn(),
      ];
      await controller.synchronizePoints(
        arg1,
        arg2,
        arg3,
        arg4,
        arg5,
        arg6,
        arg7,
        arg8,
        arg9,
      );

      expect(mockPointsController.synchronize).toHaveBeenCalledWith(
        arg1,
        arg2,
        arg3,
        arg4,
        arg5,
        arg6,
        arg7,
        arg8,
        arg9,
      );
    });
  });

  describe("synchronizeShapes", () => {
    it("delegates to shapes controller", async () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      const mockShapesController = (WebGLShapesController as any).mock
        .instances[0];
      mockShapesController.synchronize = vi.fn(async () => {});

      const [arg1, arg2, arg3, arg4, arg5, arg6, arg7] = [
        [],
        [],
        [],
        [],
        [],
        vi.fn(),
        vi.fn(),
      ];
      await controller.synchronizeShapes(
        arg1,
        arg2,
        arg3,
        arg4,
        arg5,
        arg6,
        arg7,
      );

      expect(mockShapesController.synchronize).toHaveBeenCalledWith(
        arg1,
        arg2,
        arg3,
        arg4,
        arg5,
        arg6,
        arg7,
      );
    });
  });

  describe("resizeCanvas", () => {
    it("resizes canvas with device pixel ratio", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);
      // Canvas starts at 800x600 from setup
      mockCanvas.width = 100;
      mockCanvas.height = 100;
      global.window.devicePixelRatio = 2;

      const result = controller.resizeCanvas({ width: 400, height: 300 });

      expect(mockCanvas.width).toBe(800); // 400 * 2
      expect(mockCanvas.height).toBe(600); // 300 * 2
      expect(result).toBe(true);
    });

    it("returns true when canvas size changes", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      const result = controller.resizeCanvas({ width: 400, height: 300 });

      expect(result).toBe(true);
    });

    it("returns false when canvas size does not change", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      mockCanvas.width = 400;
      mockCanvas.height = 300;

      const result = controller.resizeCanvas({ width: 400, height: 300 });

      expect(result).toBe(false);
    });

    it("clamps to max canvas size of 4096", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      global.window.devicePixelRatio = 1;

      controller.resizeCanvas({ width: 5000, height: 3000 });

      expect(mockCanvas.width).toBeLessThanOrEqual(4096);
      expect(mockCanvas.height).toBeLessThanOrEqual(4096);
    });

    it("maintains aspect ratio when scaling down", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      global.window.devicePixelRatio = 1;

      controller.resizeCanvas({ width: 5000, height: 2500 });

      // 5000:2500 = 2:1 ratio should be maintained
      expect(mockCanvas.width).toBe(4096);
      expect(mockCanvas.height).toBe(2048); // 4096 / 2
    });

    it("maintains aspect ratio when height exceeds max", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      global.window.devicePixelRatio = 1;

      controller.resizeCanvas({ width: 2000, height: 5000 });

      // 2000:5000 = 2:5 ratio should be maintained, height clamped to 4096
      expect(mockCanvas.height).toBe(4096);
      expect(mockCanvas.width).toBe(Math.floor(2000 * (4096 / 5000)));
    });

    it("sets minimum size to 1x1 for invalid dimensions", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      controller.resizeCanvas({ width: 0, height: 0 });

      expect(mockCanvas.width).toBe(1);
      expect(mockCanvas.height).toBe(1);
    });

    it("sets minimum size when width is negative", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      controller.resizeCanvas({ width: -100, height: 200 });

      expect(mockCanvas.width).toBe(1);
      expect(mockCanvas.height).toBe(1);
    });

    it("updates WebGL viewport", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      controller.resizeCanvas({ width: 400, height: 300 });

      expect(mockGl.viewport).toHaveBeenCalledWith(0, 0, 400, 300);
    });
  });

  describe("draw", () => {
    it("clears the canvas", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      controller.draw();

      expect(mockGl.clearColor).toHaveBeenCalledWith(0, 0, 0, 0);
      expect(mockGl.clear).toHaveBeenCalledWith(mockGl.COLOR_BUFFER_BIT);
    });

    it("calls draw on points controller", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      const mockPointsController = (WebGLPointsController as any).mock
        .instances[0];
      mockPointsController.draw = vi.fn();

      controller.draw();

      expect(mockPointsController.draw).toHaveBeenCalled();
    });

    it("calls draw on shapes controller", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      const mockShapesController = (WebGLShapesController as any).mock
        .instances[0];
      mockShapesController.draw = vi.fn();

      controller.draw();

      expect(mockShapesController.draw).toHaveBeenCalled();
    });

    it("passes viewport to both controllers", () => {
      const viewport = { x: 10, y: 20, width: 200, height: 150 };
      const controller = new WebGLController(mockCanvas, viewport);

      const mockPointsController = (WebGLPointsController as any).mock
        .instances[0];
      const mockShapesController = (WebGLShapesController as any).mock
        .instances[0];
      mockPointsController.draw = vi.fn();
      mockShapesController.draw = vi.fn();

      controller.draw();

      expect(mockPointsController.draw).toHaveBeenCalledWith(
        viewport,
        expect.any(Object),
      );
      expect(mockShapesController.draw).toHaveBeenCalledWith(
        viewport,
        expect.any(Object),
      );
    });
  });

  describe("destroy", () => {
    it("calls destroy on points controller", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      const mockPointsController = (WebGLPointsController as any).mock
        .instances[0];
      mockPointsController.destroy = vi.fn();

      controller.destroy();

      expect(mockPointsController.destroy).toHaveBeenCalled();
    });

    it("calls destroy on shapes controller", () => {
      const viewport = { x: 0, y: 0, width: 100, height: 100 };
      const controller = new WebGLController(mockCanvas, viewport);

      const mockShapesController = (WebGLShapesController as any).mock
        .instances[0];
      mockShapesController.destroy = vi.fn();

      controller.destroy();

      expect(mockShapesController.destroy).toHaveBeenCalled();
    });
  });
});

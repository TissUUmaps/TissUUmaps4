import { afterEach, describe, expect, it, vi } from "vitest";

import { WebGLUtils } from "./WebGLUtils";

type MockGl = {
  VERTEX_SHADER: number;
  FRAGMENT_SHADER: number;
  LINK_STATUS: number;
  ARRAY_BUFFER: number;
  TEXTURE_2D: number;
  TEXTURE_MAG_FILTER: number;
  TEXTURE_MIN_FILTER: number;
  TEXTURE_WRAP_S: number;
  TEXTURE_WRAP_T: number;
  NEAREST: number;
  CLAMP_TO_EDGE: number;
  LINEAR: number;
  LINEAR_MIPMAP_LINEAR: number;
  RGBA: number;
  UNSIGNED_BYTE: number;
  FLOAT: number;
  UNSIGNED_INT: number;
  FUNC_ADD: number;
  ONE: number;
  ONE_MINUS_SRC_ALPHA: number;
  ZERO: number;
  BLEND: number;
  __calls: {
    texImage2DArgs: unknown[] | null;
  };

  createShader: ReturnType<typeof vi.fn>;
  createProgram: ReturnType<typeof vi.fn>;
  shaderSource: ReturnType<typeof vi.fn>;
  compileShader: ReturnType<typeof vi.fn>;
  attachShader: ReturnType<typeof vi.fn>;
  linkProgram: ReturnType<typeof vi.fn>;
  getProgramParameter: ReturnType<typeof vi.fn>;
  getProgramInfoLog: ReturnType<typeof vi.fn>;
  getShaderInfoLog: ReturnType<typeof vi.fn>;
  deleteShader: ReturnType<typeof vi.fn>;
  getUniformLocation: ReturnType<typeof vi.fn>;
  createBuffer: ReturnType<typeof vi.fn>;
  bindBuffer: ReturnType<typeof vi.fn>;
  bufferData: ReturnType<typeof vi.fn>;
  createVertexArray: ReturnType<typeof vi.fn>;
  enableVertexAttribArray: ReturnType<typeof vi.fn>;
  vertexAttribPointer: ReturnType<typeof vi.fn>;
  vertexAttribDivisor: ReturnType<typeof vi.fn>;
  vertexAttribIPointer: ReturnType<typeof vi.fn>;
  createTexture: ReturnType<typeof vi.fn>;
  bindTexture: ReturnType<typeof vi.fn>;
  texParameteri: ReturnType<typeof vi.fn>;
  texStorage2D: ReturnType<typeof vi.fn>;
  texSubImage2D: ReturnType<typeof vi.fn>;
  texImage2D: ReturnType<typeof vi.fn>;
  generateMipmap: ReturnType<typeof vi.fn>;
  bufferSubData: ReturnType<typeof vi.fn>;
  enable: ReturnType<typeof vi.fn>;
  blendEquation: ReturnType<typeof vi.fn>;
  blendFuncSeparate: ReturnType<typeof vi.fn>;
  disable: ReturnType<typeof vi.fn>;
  viewport: ReturnType<typeof vi.fn>;
};

const createMockGl = (
  overrides: Partial<Record<keyof MockGl, unknown>> = {},
): MockGl => {
  const gl = {
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    LINK_STATUS: 0x8b82,
    ARRAY_BUFFER: 0x8892,
    TEXTURE_2D: 0x0de1,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    NEAREST: 0x2600,
    CLAMP_TO_EDGE: 0x812f,
    LINEAR: 0x2601,
    LINEAR_MIPMAP_LINEAR: 0x2703,
    RGBA: 0x1908,
    UNSIGNED_BYTE: 0x1401,
    FLOAT: 0x1406,
    UNSIGNED_INT: 0x1405,
    FUNC_ADD: 0x8006,
    ONE: 1,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    ZERO: 0,
    BLEND: 0x0be2,
    __calls: {
      texImage2DArgs: null,
    },
    createShader: vi.fn(() => ({ type: "shader" })),
    createProgram: vi.fn(() => ({ type: "program" })),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => "program-log"),
    getShaderInfoLog: vi.fn(() => "shader-log"),
    deleteShader: vi.fn(),
    getUniformLocation: vi.fn(() => ({ type: "uniform" })),
    createBuffer: vi.fn(() => ({ type: "buffer" })),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    createVertexArray: vi.fn(() => ({ type: "vao" })),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    vertexAttribDivisor: vi.fn(),
    vertexAttribIPointer: vi.fn(),
    createTexture: vi.fn(() => ({ type: "texture" })),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    texStorage2D: vi.fn(),
    texSubImage2D: vi.fn(),
    texImage2D: vi.fn((...args: unknown[]) => {
      gl.__calls.texImage2DArgs = args;
    }),
    generateMipmap: vi.fn(),
    bufferSubData: vi.fn(),
    enable: vi.fn(),
    blendEquation: vi.fn(),
    blendFuncSeparate: vi.fn(),
    disable: vi.fn(),
    viewport: vi.fn(),
  } as unknown as MockGl;

  Object.assign(gl, overrides);
  return gl;
};

const asWebGL2 = (gl: MockGl): WebGL2RenderingContext =>
  gl as unknown as WebGL2RenderingContext;

const createCanvas = (gl: MockGl | null) => ({
  width: 320,
  height: 200,
  getContext: vi.fn(() => (gl ? asWebGL2(gl) : null)),
});

class MockImage {
  static lastInstance: MockImage | null = null;

  onload: (() => void) | null = null;

  onerror: ((...args: unknown[]) => void) | null = null;

  src = "";

  constructor() {
    MockImage.lastInstance = this;
  }

  triggerLoad(): void {
    this.onload?.();
  }

  triggerError(error?: unknown): void {
    const args = [null, null, null, null, error];
    this.onerror?.(...args);
  }
}

describe("WebGLUtils", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    (vi as { unstubAllGlobals?: () => void }).unstubAllGlobals?.();
    MockImage.lastInstance = null;
  });

  describe("init", () => {
    it("creates a WebGL2 context and sets viewport", () => {
      const gl = createMockGl();
      const canvas = createCanvas(gl);

      const result = WebGLUtils.init(canvas as unknown as HTMLCanvasElement);

      expect(result).toBe(gl);
      expect(canvas.getContext).toHaveBeenCalledWith("webgl2", undefined);
      expect(gl.viewport).toHaveBeenCalledWith(0, 0, 320, 200);
    });

    it("throws when WebGL2 is unavailable", () => {
      const canvas = createCanvas(null);

      expect(() =>
        WebGLUtils.init(canvas as unknown as HTMLCanvasElement),
      ).toThrow("WebGL 2.0 is not supported by the browser.");
    });
  });

  describe("loadProgram", () => {
    it("throws when vertex shader creation fails", () => {
      const gl = createMockGl({ createShader: vi.fn(() => null) });

      expect(() =>
        WebGLUtils.loadProgram(asWebGL2(gl), "vertex", "fragment"),
      ).toThrow("Failed to create vertex shader.");
    });

    it("throws when fragment shader creation fails", () => {
      const createShader = vi
        .fn()
        .mockReturnValueOnce({ type: "vertex" })
        .mockReturnValueOnce(null);
      const gl = createMockGl({ createShader });

      expect(() =>
        WebGLUtils.loadProgram(asWebGL2(gl), "vertex", "fragment"),
      ).toThrow("Failed to create fragment shader.");
    });

    it("throws when program creation fails", () => {
      const gl = createMockGl({ createProgram: vi.fn(() => null) });

      expect(() =>
        WebGLUtils.loadProgram(asWebGL2(gl), "vertex", "fragment"),
      ).toThrow("Failed to create shader program.");
      expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    });

    it("throws with logs when linking fails", () => {
      const gl = createMockGl({ getProgramParameter: vi.fn(() => false) });

      expect(() =>
        WebGLUtils.loadProgram(asWebGL2(gl), "vertex", "fragment"),
      ).toThrow(
        "Shader program linking failed: program-log\nVertex shader log: shader-log\nFragment shader log: shader-log",
      );
      expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    });

    it("returns program on success", () => {
      const gl = createMockGl();

      const program = WebGLUtils.loadProgram(
        asWebGL2(gl),
        "vertex",
        "fragment",
      );

      expect(program).toEqual({ type: "program" });
      expect(gl.attachShader).toHaveBeenCalledTimes(2);
      expect(gl.linkProgram).toHaveBeenCalledTimes(1);
      expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    });
  });

  describe("getUniformLocation", () => {
    it("returns uniform location", () => {
      const gl = createMockGl();
      const program = { type: "program" } as WebGLProgram;

      const location = WebGLUtils.getUniformLocation(
        asWebGL2(gl),
        program,
        "uColor",
      );

      expect(location).toEqual({ type: "uniform" });
      expect(gl.getUniformLocation).toHaveBeenCalledWith(program, "uColor");
    });

    it("throws when uniform is missing", () => {
      const gl = createMockGl({ getUniformLocation: vi.fn(() => null) });

      expect(() =>
        WebGLUtils.getUniformLocation(
          asWebGL2(gl),
          { type: "program" },
          "uMissing",
        ),
      ).toThrow("Failed to get uniform location for uMissing");
    });
  });

  describe("createBuffer", () => {
    it("creates a buffer", () => {
      const gl = createMockGl();

      const buffer = WebGLUtils.createBuffer(asWebGL2(gl));

      expect(buffer).toEqual({ type: "buffer" });
    });

    it("throws when buffer creation fails", () => {
      const gl = createMockGl({ createBuffer: vi.fn(() => null) });

      expect(() => WebGLUtils.createBuffer(asWebGL2(gl))).toThrow(
        "Failed to create buffer.",
      );
    });
  });

  describe("resizeBuffer", () => {
    it("binds buffer, resizes, and unbinds", () => {
      const gl = createMockGl();
      const buffer = { type: "buffer" } as WebGLBuffer;

      WebGLUtils.resizeBuffer(
        asWebGL2(gl),
        gl.ARRAY_BUFFER,
        buffer,
        64,
        0x88e4,
      );

      expect(gl.bindBuffer).toHaveBeenNthCalledWith(1, gl.ARRAY_BUFFER, buffer);
      expect(gl.bufferData).toHaveBeenCalledWith(gl.ARRAY_BUFFER, 64, 0x88e4);
      expect(gl.bindBuffer).toHaveBeenNthCalledWith(2, gl.ARRAY_BUFFER, null);
    });
  });

  describe("createVertexArray", () => {
    it("creates a VAO", () => {
      const gl = createMockGl();

      const vao = WebGLUtils.createVertexArray(asWebGL2(gl));

      expect(vao).toEqual({ type: "vao" });
    });

    it("throws when VAO creation fails", () => {
      const gl = createMockGl({ createVertexArray: vi.fn(() => null) });

      expect(() => WebGLUtils.createVertexArray(asWebGL2(gl))).toThrow(
        "Failed to create vertex array object.",
      );
    });
  });

  describe("configureVertexFloatAttribute", () => {
    it("configures float vertex attributes", () => {
      const gl = createMockGl();
      const buffer = { type: "buffer" } as WebGLBuffer;

      WebGLUtils.configureVertexFloatAttribute(
        asWebGL2(gl),
        gl.ARRAY_BUFFER,
        buffer,
        2,
        3,
        gl.FLOAT,
        { normalized: true, stride: 16, offset: 4, divisor: 2 },
      );

      expect(gl.bindBuffer).toHaveBeenNthCalledWith(1, gl.ARRAY_BUFFER, buffer);
      expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(2);
      expect(gl.vertexAttribPointer).toHaveBeenCalledWith(
        2,
        3,
        gl.FLOAT,
        true,
        16,
        4,
      );
      expect(gl.vertexAttribDivisor).toHaveBeenCalledWith(2, 2);
      expect(gl.bindBuffer).toHaveBeenNthCalledWith(2, gl.ARRAY_BUFFER, null);
    });
  });

  describe("configureVertexIntAttribute", () => {
    it("configures integer vertex attributes", () => {
      const gl = createMockGl();
      const buffer = { type: "buffer" } as WebGLBuffer;

      WebGLUtils.configureVertexIntAttribute(
        asWebGL2(gl),
        gl.ARRAY_BUFFER,
        buffer,
        1,
        2,
        gl.UNSIGNED_INT,
        { stride: 8, offset: 4, divisor: 1 },
      );

      expect(gl.bindBuffer).toHaveBeenNthCalledWith(1, gl.ARRAY_BUFFER, buffer);
      expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(1);
      expect(gl.vertexAttribIPointer).toHaveBeenCalledWith(
        1,
        2,
        gl.UNSIGNED_INT,
        8,
        4,
      );
      expect(gl.vertexAttribDivisor).toHaveBeenCalledWith(1, 1);
      expect(gl.bindBuffer).toHaveBeenNthCalledWith(2, gl.ARRAY_BUFFER, null);
    });
  });

  describe("createDataTexture", () => {
    it("creates a texture with storage and data", () => {
      const gl = createMockGl();
      const data = new Float32Array([0, 1, 2, 3]);

      const texture = WebGLUtils.createDataTexture(
        asWebGL2(gl),
        0x8814,
        2,
        2,
        gl.RGBA,
        gl.FLOAT,
        data,
      );

      expect(texture).toEqual({ type: "texture" });
      expect(gl.texStorage2D).toHaveBeenCalledWith(
        gl.TEXTURE_2D,
        1,
        0x8814,
        2,
        2,
      );
      expect(gl.texSubImage2D).toHaveBeenCalledWith(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        2,
        2,
        gl.RGBA,
        gl.FLOAT,
        data,
      );
      expect(gl.bindTexture).toHaveBeenLastCalledWith(gl.TEXTURE_2D, null);
    });

    it("creates a texture without data upload", () => {
      const gl = createMockGl();

      WebGLUtils.createDataTexture(
        asWebGL2(gl),
        0x8814,
        1,
        1,
        gl.RGBA,
        gl.FLOAT,
      );

      expect(gl.texSubImage2D).not.toHaveBeenCalled();
    });

    it("throws when texture creation fails", () => {
      const gl = createMockGl({ createTexture: vi.fn(() => null) });

      expect(() =>
        WebGLUtils.createDataTexture(
          asWebGL2(gl),
          0x8814,
          1,
          1,
          gl.RGBA,
          gl.FLOAT,
        ),
      ).toThrow("Failed to create texture.");
    });
  });

  describe("loadDataTexture", () => {
    it("uploads new data to a texture", () => {
      const gl = createMockGl();
      const texture = { type: "texture" } as WebGLTexture;
      const data = new Float32Array([0, 1, 2, 3]);

      WebGLUtils.loadDataTexture(
        asWebGL2(gl),
        texture,
        2,
        2,
        gl.RGBA,
        gl.FLOAT,
        data,
      );

      expect(gl.bindTexture).toHaveBeenNthCalledWith(1, gl.TEXTURE_2D, texture);
      expect(gl.texSubImage2D).toHaveBeenCalledWith(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        2,
        2,
        gl.RGBA,
        gl.FLOAT,
        data,
      );
      expect(gl.bindTexture).toHaveBeenNthCalledWith(2, gl.TEXTURE_2D, null);
    });
  });

  describe("loadImageTextureFromUrl", () => {
    it("throws when texture creation fails", async () => {
      const gl = createMockGl({ createTexture: vi.fn(() => null) });

      await expect(
        WebGLUtils.loadImageTextureFromUrl(
          asWebGL2(gl),
          "https://example.com/img.png",
        ),
      ).rejects.toThrow("Failed to create texture.");
    });

    it("loads an image texture without mipmaps", async () => {
      const gl = createMockGl();
      vi.stubGlobal("Image", MockImage);

      const promise = WebGLUtils.loadImageTextureFromUrl(
        asWebGL2(gl),
        "https://example.com/img.png",
      );

      MockImage.lastInstance?.triggerLoad();
      const texture = await promise;

      expect(texture).toEqual({ type: "texture" });
      expect(gl.texParameteri).toHaveBeenCalledWith(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR,
      );
      expect(gl.__calls.texImage2DArgs?.[5]).toBe(MockImage.lastInstance);
      expect(gl.generateMipmap).not.toHaveBeenCalled();
    });

    it("loads an image texture with mipmaps", async () => {
      const gl = createMockGl();
      vi.stubGlobal("Image", MockImage);

      const promise = WebGLUtils.loadImageTextureFromUrl(
        asWebGL2(gl),
        "https://example.com/img.png",
        { mipmap: true },
      );

      MockImage.lastInstance?.triggerLoad();
      await promise;

      expect(gl.texParameteri).toHaveBeenCalledWith(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      );
      expect(gl.generateMipmap).toHaveBeenCalledWith(gl.TEXTURE_2D);
    });

    it("rejects on image load error with provided error", async () => {
      const gl = createMockGl();
      vi.stubGlobal("Image", MockImage);

      const promise = WebGLUtils.loadImageTextureFromUrl(
        asWebGL2(gl),
        "https://example.com/img.png",
      );

      const error = new Error("load failed");
      MockImage.lastInstance?.triggerError(error);

      await expect(promise).rejects.toBe(error);
    });

    it("rejects on image load error without provided error", async () => {
      const gl = createMockGl();
      vi.stubGlobal("Image", MockImage);

      const promise = WebGLUtils.loadImageTextureFromUrl(
        asWebGL2(gl),
        "https://example.com/img.png",
      );

      MockImage.lastInstance?.triggerError();

      await expect(promise).rejects.toThrow(
        "Failed to load image: https://example.com/img.png",
      );
    });

    it("throws if signal is already aborted", async () => {
      const gl = createMockGl();
      const throwIfAborted = vi.fn(() => {
        throw new Error("aborted");
      });
      const signal = {
        throwIfAborted,
      } as unknown as AbortSignal;

      await expect(
        WebGLUtils.loadImageTextureFromUrl(asWebGL2(gl), "url", { signal }),
      ).rejects.toThrow("aborted");
      expect(throwIfAborted).toHaveBeenCalledTimes(1);
    });

    it("calls abort checks before and after load", async () => {
      const gl = createMockGl();
      vi.stubGlobal("Image", MockImage);
      const throwIfAborted = vi.fn();
      const signal = {
        throwIfAborted,
      } as unknown as AbortSignal;

      const promise = WebGLUtils.loadImageTextureFromUrl(asWebGL2(gl), "url", {
        signal,
      });

      MockImage.lastInstance?.triggerLoad();
      await promise;

      expect(throwIfAborted).toHaveBeenCalledTimes(2);
    });
  });

  describe("loadBuffer", () => {
    it("uploads buffer data with element offset", () => {
      const gl = createMockGl();
      const buffer = { type: "buffer" } as WebGLBuffer;
      const data = new Uint16Array([1, 2, 3]);

      WebGLUtils.loadBuffer(asWebGL2(gl), gl.ARRAY_BUFFER, buffer, data, {
        offset: 2,
      });

      expect(gl.bindBuffer).toHaveBeenNthCalledWith(1, gl.ARRAY_BUFFER, buffer);
      expect(gl.bufferSubData).toHaveBeenCalledWith(
        gl.ARRAY_BUFFER,
        2 * data.BYTES_PER_ELEMENT,
        data,
      );
      expect(gl.bindBuffer).toHaveBeenNthCalledWith(2, gl.ARRAY_BUFFER, null);
    });
  });

  describe("alpha blending", () => {
    it("enables premultiplied alpha blending", () => {
      const gl = createMockGl();

      WebGLUtils.enableAlphaBlending(asWebGL2(gl));

      expect(gl.enable).toHaveBeenCalledWith(gl.BLEND);
      expect(gl.blendEquation).toHaveBeenCalledWith(gl.FUNC_ADD);
      expect(gl.blendFuncSeparate).toHaveBeenCalledWith(
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA,
      );
    });

    it("disables blending and restores defaults", () => {
      const gl = createMockGl();

      WebGLUtils.disableAlphaBlending(asWebGL2(gl));

      expect(gl.disable).toHaveBeenCalledWith(gl.BLEND);
      expect(gl.blendEquation).toHaveBeenCalledWith(gl.FUNC_ADD);
      expect(gl.blendFuncSeparate).toHaveBeenCalledWith(
        gl.ONE,
        gl.ZERO,
        gl.ONE,
        gl.ZERO,
      );
    });
  });
});

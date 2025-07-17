import { IPointsData } from "../data/points";
import { IShapesData } from "../data/shapes";
import { ILayerModel } from "../models/layer";
import { IPointsModel } from "../models/points";
import { IShapesModel } from "../models/shapes";
import pointsFragmentShaderSource from "./shaders/points.frag?raw";
import pointsVertexShaderSource from "./shaders/points.vert?raw";

export default class WebGLController {
  private readonly _canvas: HTMLCanvasElement;
  private _context: WebGLContext;

  constructor(parent: HTMLElement) {
    this._canvas = this._initCanvas(parent);
    this._context = new WebGLContext(this._canvas);
  }

  async synchronize(
    layerMap: Map<string, ILayerModel>,
    pointsMap: Map<string, IPointsModel>,
    shapesMap: Map<string, IShapesModel>,
    loadPoints: (points: IPointsModel) => Promise<IPointsData>,
    loadShapes: (shapes: IShapesModel) => Promise<IShapesData>,
    isCurrent: () => boolean,
  ): Promise<void> {
    await this._context.synchronize(
      layerMap,
      pointsMap,
      shapesMap,
      loadPoints,
      loadShapes,
      isCurrent,
    );
  }

  destroy(): void {
    this._context.destroy();
  }

  private _initCanvas(parent: HTMLElement): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    canvas.style = // TODO double-check whether pointer-events and z-index are needed
      "position: relative; pointer-events: none; z-index: 12; width: 100%; height: 100%;";
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault(); // allow context to be restored
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this._context = new WebGLContext(canvas); // gracefully restore context
    });
    // Place marker canvas under the parent (OpenSeadragon) canvas to enable
    // proper compositing with the minimap and other OpenSeadragon elements.
    parent.appendChild(canvas);
    return canvas;
  }
}

class WebGLContext {
  private static readonly _SHADER_PREPROCESSOR = "#version 300 es";
  private static readonly _GL_OPTIONS: WebGLContextAttributes = {
    antialias: false,
    preserveDrawingBuffer: true,
  };

  private readonly _gl: WebGL2RenderingContext;
  private readonly _pointsShaderProgram: WebGLProgram;
  private readonly _pointsShaderBuffers: {
    a_position: WebGLBuffer;
    a_size: WebGLBuffer;
    a_color: WebGLBuffer;
    a_opacity: WebGLBuffer;
    a_markerIndex: WebGLBuffer;
    a_transformIndex: WebGLBuffer;
  };

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", WebGLContext._GL_OPTIONS);
    if (gl === null) {
      throw new Error("WebGL 2.0 is not supported by the browser.");
    }
    this._gl = gl;
    this._pointsShaderProgram = this._loadShaderProgram(
      pointsVertexShaderSource,
      pointsFragmentShaderSource,
    );
    this._pointsShaderBuffers = {
      a_position: this._gl.createBuffer(),
      a_size: this._gl.createBuffer(),
      a_color: this._gl.createBuffer(),
      a_opacity: this._gl.createBuffer(),
      a_markerIndex: this._gl.createBuffer(),
      a_transformIndex: this._gl.createBuffer(),
    };
  }

  async synchronize(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _layerMap: Map<string, ILayerModel>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _pointsMap: Map<string, IPointsModel>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _shapesMap: Map<string, IShapesModel>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _loadPoints: (points: IPointsModel) => Promise<IPointsData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _loadShapes: (shapes: IShapesModel) => Promise<IShapesData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _isCurrent: () => boolean,
  ): Promise<void> {}

  destroy(): void {
    this._gl.deleteProgram(this._pointsShaderProgram);
    for (const pointsShaderBuffer of Object.values(this._pointsShaderBuffers)) {
      this._gl.deleteBuffer(pointsShaderBuffer);
    }
  }

  private _loadShaderProgram(
    vertexShaderSource: string,
    fragmentShaderSource: string,
    header?: string,
  ): WebGLProgram {
    if (header) {
      vertexShaderSource = vertexShaderSource.replace(
        `${WebGLContext._SHADER_PREPROCESSOR}\n`,
        `${WebGLContext._SHADER_PREPROCESSOR}\n${header}\n`,
      );
      fragmentShaderSource = fragmentShaderSource.replace(
        `${WebGLContext._SHADER_PREPROCESSOR}\n`,
        `${WebGLContext._SHADER_PREPROCESSOR}\n${header}\n`,
      );
    }
    const vertexShader = this._gl.createShader(this._gl.VERTEX_SHADER);
    if (vertexShader === null) {
      throw new Error("Failed to create vertex shader.");
    }
    const fragmentShader = this._gl.createShader(this._gl.FRAGMENT_SHADER);
    if (fragmentShader === null) {
      throw new Error("Failed to create fragment shader.");
    }
    try {
      const program = this._gl.createProgram();
      for (const [shader, shaderSource] of [
        [vertexShader, vertexShaderSource],
        [fragmentShader, fragmentShaderSource],
      ] as const) {
        this._gl.shaderSource(shader, shaderSource);
        this._gl.compileShader(shader);
        this._gl.attachShader(program, shader);
      }
      this._gl.linkProgram(program);
      if (!this._gl.getProgramParameter(program, this._gl.LINK_STATUS)) {
        const programInfoLog = this._gl.getProgramInfoLog(program);
        const vertexShaderInfoLog = this._gl.getShaderInfoLog(vertexShader);
        const fragmentShaderInfoLog = this._gl.getShaderInfoLog(fragmentShader);
        throw new Error(
          `Shader program linking failed: ${programInfoLog}\n` +
            `Vertex shader log: ${vertexShaderInfoLog}\n` +
            `Fragment shader log: ${fragmentShaderInfoLog}`,
        );
      }
      return program;
    } finally {
      // flag shader for deletion (i.e., delete them when no longer in use)
      // https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDeleteShader.xhtml
      this._gl.deleteShader(vertexShader);
      this._gl.deleteShader(fragmentShader);
    }
  }
}

import { IPointsData } from "../data/points";
import { IShapesData } from "../data/shapes";
import { ILayerModel } from "../models/layer";
import { IPointsModel } from "../models/points";
import { IShapesModel } from "../models/shapes";
import pointsFragmentShaderSource from "./shaders/points.frag?raw";
import pointsVertexShaderSource from "./shaders/points.vert?raw";

export default class WebGLController {
  private readonly _parent: HTMLElement;
  private readonly _canvas: HTMLCanvasElement;
  private _context: WebGLContext;

  constructor(parent: HTMLElement) {
    this._parent = parent;
    this._canvas = this._createCanvas(this._parent);
    this._context = new WebGLContext(this._canvas);

    // TODO

    // // Get HW capabilities from WebGL context
    // glUtils._caps[gl.MAX_TEXTURE_SIZE] = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    // glUtils._caps[gl.ALIASED_POINT_SIZE_RANGE] = gl.getParameter(
    //   gl.ALIASED_POINT_SIZE_RANGE,
    // );
    // console.assert(
    //   glUtils._caps[gl.ALIASED_POINT_SIZE_RANGE] instanceof Float32Array,
    // );

    // // Disable instanced marker drawing by default if the HW point size limit
    // // is large enough. Should be faster in most cases, and we can still
    // // temporarily switch to instanced drawing during viewport captures to
    // // avoid the HW point size limit.
    // if (glUtils._caps[gl.ALIASED_POINT_SIZE_RANGE][1] >= 1023) {
    //   glUtils._useInstancing = false;
    // }

    // this._textures["shapeAtlas"] = this._loadTextureFromImageURL(
    //   gl,
    //   glUtils._markershapes,
    // );
    // this._buffers["quad"] = this._createQuad(gl);
    // this._buffers["transformUBO"] = this._createUniformBuffer(gl);
    // this._textures["regionLUT"] = this._createRegionLUTTexture(
    //   gl,
    //   glUtils._regionMaxNumRegions,
    // );
    // this._vaos["empty"] = gl.createVertexArray();

    // glUtils.updateMarkerScale();
    // document
    //   .getElementById("ISS_globalmarkersize_text")
    //   .addEventListener("input", glUtils.updateMarkerScale);
    // document
    //   .getElementById("ISS_globalmarkersize_text")
    //   .addEventListener("input", glUtils.draw);

    // tmapp["hideSVGMarkers"] = true;
    // tmapp["ISS_viewer"].removeHandler("resize", glUtils.resizeAndDraw);
    // tmapp["ISS_viewer"].addHandler("resize", glUtils.resizeAndDraw);
    // tmapp["ISS_viewer"].removeHandler("open", glUtils.draw);
    // tmapp["ISS_viewer"].addHandler("open", glUtils.draw);
    // tmapp["ISS_viewer"].removeHandler("viewport-change", glUtils.draw);
    // tmapp["ISS_viewer"].addHandler("viewport-change", glUtils.draw);

    // glUtils.resize(); // Force initial resize to OSD canvas size
  }

  synchronize(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _layers: Map<string, ILayerModel>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _points: Map<string, IPointsModel>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _shapes: Map<string, IShapesModel>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _pointsData: Map<string, IPointsData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _shapesData: Map<string, IShapesData>,
  ): void {}

  destroy(): void {
    this._context.destroy();
    this._parent.removeChild(this._canvas);
  }

  private _createCanvas(parent: HTMLElement): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    canvas.style = // TODO double-check whether pointer-events and z-index are needed
      "position: relative; pointer-events: none; z-index: 12; width: 100%; height: 100%;";
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault(); // allow context to be restored
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this._context = new WebGLContext(this._canvas); // gracefully restore context
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
  }

  destroy(): void {
    this._gl.deleteProgram(this._pointsShaderProgram);
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
      this._gl.deleteShader(vertexShader);
      this._gl.deleteShader(fragmentShader);
    }
  }
}

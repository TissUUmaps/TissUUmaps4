import pointsFragmentShader from "shaders/points.frag?raw";
import pointsVertexShader from "shaders/points.vert?raw";
import shapesFragmentShader from "shaders/shapes.frag?raw";
import shapesVertexShader from "shaders/shapes.vert?raw";

import { IPointsData } from "../data/points";
import { IShapesData } from "../data/shapes";
import { ILayerModel } from "../models/layer";
import { IPointsModel } from "../models/points";
import { IShapesModel } from "../models/shapes";

class WebGLContext {
  private static readonly _SHADER_PREPROCESSOR = "#version 300 es";
  private static readonly _GL_OPTIONS: WebGLContextAttributes = {
    antialias: false,
    preserveDrawingBuffer: true,
  };

  private readonly _gl: WebGL2RenderingContext;
  private readonly _directPointsShaderProgram: WebGLProgram;
  private readonly _instancedPointsShaderProgram: WebGLProgram;
  private readonly _shapesShaderProgram: WebGLProgram;

  constructor(canvas: HTMLCanvasElement) {
    this._gl = this._getWebGL2Context(canvas);
    this._directPointsShaderProgram = this._loadShaderProgram(
      pointsVertexShader,
      pointsFragmentShader,
    );
    this._instancedPointsShaderProgram = this._loadShaderProgram(
      pointsVertexShader,
      pointsFragmentShader,
      "#define USE_INSTANCING",
    );
    this._shapesShaderProgram = this._loadShaderProgram(
      shapesVertexShader,
      shapesFragmentShader,
    );
  }

  destroy() {
    this._gl.deleteProgram(this._directPointsShaderProgram);
    this._gl.deleteProgram(this._instancedPointsShaderProgram);
    this._gl.deleteProgram(this._shapesShaderProgram);
  }

  private _getWebGL2Context(canvas: HTMLCanvasElement): WebGL2RenderingContext {
    const context = canvas.getContext("webgl2", WebGLContext._GL_OPTIONS);
    if (context === null) {
      throw new Error("WebGL 2.0 is not supported by your browser.");
    }
    return context;
  }

  private _loadShaderProgram(
    vertexSource: string,
    fragmentSource: string,
    header?: string,
  ): WebGLProgram {
    if (header) {
      vertexSource = vertexSource.replace(
        `${WebGLContext._SHADER_PREPROCESSOR}\n`,
        `${WebGLContext._SHADER_PREPROCESSOR}\n${header}\n`,
      );
      fragmentSource = fragmentSource.replace(
        `${WebGLContext._SHADER_PREPROCESSOR}\n`,
        `${WebGLContext._SHADER_PREPROCESSOR}\n${header}\n`,
      );
    }
    const vertexShader = this._gl.createShader(this._gl.VERTEX_SHADER);
    if (vertexShader === null) {
      throw new Error("Failed to create vertex shader.");
    }
    this._gl.shaderSource(vertexShader, vertexSource);
    this._gl.compileShader(vertexShader);
    if (!this._gl.getShaderParameter(vertexShader, this._gl.COMPILE_STATUS)) {
      throw new Error(
        `Vertex shader compilation failed: ${this._gl.getShaderInfoLog(vertexShader)}`,
      );
    }
    const fragmentShader = this._gl.createShader(this._gl.FRAGMENT_SHADER);
    if (fragmentShader === null) {
      throw new Error("Failed to create fragment shader.");
    }
    this._gl.shaderSource(fragmentShader, fragmentSource);
    this._gl.compileShader(fragmentShader);
    if (!this._gl.getShaderParameter(fragmentShader, this._gl.COMPILE_STATUS)) {
      throw new Error(
        `Fragment shader compilation failed: ${this._gl.getShaderInfoLog(fragmentShader)}`,
      );
    }
    const program = this._gl.createProgram();
    this._gl.attachShader(program, vertexShader);
    this._gl.attachShader(program, fragmentShader);
    this._gl.linkProgram(program);
    this._gl.deleteShader(vertexShader); // clean up shaders after linking
    this._gl.deleteShader(fragmentShader); // clean up shaders after linking
    if (!this._gl.getProgramParameter(program, this._gl.LINK_STATUS)) {
      throw new Error(
        `Shader program linking failed: ${this._gl.getProgramInfoLog(program)}`,
      );
    }
    return program;
  }
}

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

  destroy() {
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

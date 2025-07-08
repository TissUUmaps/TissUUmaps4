import pointsFragmentShader from "shaders/points.frag?raw";
import pointsVertexShader from "shaders/points.vert?raw";
import shapesFragmentShader from "shaders/shapes.frag?raw";
import shapesVertexShader from "shaders/shapes.vert?raw";

import { IPointsData } from "../data/points";
import { IShapesData } from "../data/shapes";
import { ILayerModel } from "../models/layer";
import { IPointsModel } from "../models/points";
import { IShapesModel } from "../models/shapes";

export default class WebGLController {
  private static readonly SHADER_PREPROCESSOR = "#version 300 es";
  private static readonly GL_OPTIONS: WebGLContextAttributes = {
    antialias: false,
    preserveDrawingBuffer: true,
  };

  private readonly parent: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;

  private readonly directPointsShaderProgram: WebGLProgram;
  private readonly instancedPointsShaderProgram: WebGLProgram;
  private readonly shapesShaderProgram: WebGLProgram;

  constructor(parent: HTMLElement) {
    this.parent = parent;
    this.canvas = this.createCanvas(this.parent);
    this.gl = this.getWebGL2Context(this.canvas);
    this.directPointsShaderProgram = this.loadShaderProgram(
      pointsVertexShader,
      pointsFragmentShader,
    );
    this.instancedPointsShaderProgram = this.loadShaderProgram(
      pointsVertexShader,
      pointsFragmentShader,
      "#define USE_INSTANCING",
    );
    this.shapesShaderProgram = this.loadShaderProgram(
      shapesVertexShader,
      shapesFragmentShader,
    );

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

  private createCanvas(parent: HTMLElement): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;

    // TODO
    // canvas.style =
    //   "position:relative; pointer-events:none; z-index: 12; width: 100%; height: 100%";
    // canvas.addEventListener("webglcontextlost", function(e) { e.preventDefault(); }, false);
    // canvas.addEventListener("webglcontextrestored", glUtils.restoreLostContext, false);

    // Place marker canvas under the parent (OpenSeadragon) canvas to enable
    // proper compositing with the minimap and other OpenSeadragon elements.
    parent.appendChild(canvas);
    return canvas;
  }

  private getWebGL2Context(canvas: HTMLCanvasElement): WebGL2RenderingContext {
    const context = canvas.getContext("webgl2", WebGLController.GL_OPTIONS);
    if (context === null) {
      throw new Error("WebGL 2.0 is not supported by your browser.");
    }
    return context;
  }

  private loadShaderProgram(
    vertexSource: string,
    fragmentSource: string,
    header?: string,
  ): WebGLProgram {
    if (header) {
      vertexSource = vertexSource.replace(
        `${WebGLController.SHADER_PREPROCESSOR}\n`,
        `${WebGLController.SHADER_PREPROCESSOR}\n${header}\n`,
      );
      fragmentSource = fragmentSource.replace(
        `${WebGLController.SHADER_PREPROCESSOR}\n`,
        `${WebGLController.SHADER_PREPROCESSOR}\n${header}\n`,
      );
    }
    const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
    if (vertexShader === null) {
      throw new Error("Failed to create vertex shader.");
    }
    this.gl.shaderSource(vertexShader, vertexSource);
    this.gl.compileShader(vertexShader);
    if (!this.gl.getShaderParameter(vertexShader, this.gl.COMPILE_STATUS)) {
      throw new Error(
        `Vertex shader compilation failed: ${this.gl.getShaderInfoLog(vertexShader)}`,
      );
    }
    const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    if (fragmentShader === null) {
      throw new Error("Failed to create fragment shader.");
    }
    this.gl.shaderSource(fragmentShader, fragmentSource);
    this.gl.compileShader(fragmentShader);
    if (!this.gl.getShaderParameter(fragmentShader, this.gl.COMPILE_STATUS)) {
      throw new Error(
        `Fragment shader compilation failed: ${this.gl.getShaderInfoLog(fragmentShader)}`,
      );
    }
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    this.gl.deleteShader(vertexShader); // clean up shaders after linking
    this.gl.deleteShader(fragmentShader); // clean up shaders after linking
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error(
        `Shader program linking failed: ${this.gl.getProgramInfoLog(program)}`,
      );
    }
    return program;
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
    this.gl.deleteProgram(this.directPointsShaderProgram);
    this.gl.deleteProgram(this.instancedPointsShaderProgram);
    this.gl.deleteProgram(this.shapesShaderProgram);
    this.parent.removeChild(this.canvas);
  }
}

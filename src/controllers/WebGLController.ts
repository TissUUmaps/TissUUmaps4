import { IPointsData } from "../data/points";
import { IShapesData } from "../data/shapes";
import { ITableData } from "../data/table";
import { ILayerModel } from "../models/layer";
import { IPointsModel } from "../models/points";
import { IShapesModel } from "../models/shapes";
import {
  Color,
  Marker,
  isColor,
  isMarker,
  isTableGroupsColumn,
  isTableValuesColumn,
} from "../models/types";
import ArrayUtils from "../utils/ArrayUtils";
import ColorUtils from "../utils/ColorUtils";
import pointsFragmentShaderSource from "./shaders/points.frag?raw";
import pointsVertexShaderSource from "./shaders/points.vert?raw";

export default class WebGLController {
  private readonly _canvas: HTMLCanvasElement;
  private _context: WebGLContext;

  constructor(parent: HTMLElement) {
    this._canvas = WebGLController._createCanvas(parent);
    this._context = new WebGLContext(this._canvas);
    this._canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault(); // allow context to be restored
    });
    this._canvas.addEventListener("webglcontextrestored", () => {
      this._context = new WebGLContext(this._canvas);
    });
  }

  destroy(): void {
    this._context.destroy();
  }

  getContext(): WebGLContext {
    return this._context;
  }

  private static _createCanvas(parent: HTMLElement): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    canvas.style = // TODO double-check whether pointer-events and z-index are needed
      "position: relative; pointer-events: none; z-index: 12; width: 100%; height: 100%;";
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
  private static readonly _DEFAULT_POINT_SIZE = 1.0;
  private static readonly _DEFAULT_POINT_COLOR: Color = {
    r: 0.0,
    g: 0.0,
    b: 0.0,
  };
  private static readonly _DEFAULT_POINT_OPACITY = 1.0;
  private static readonly _DEFAULT_POINT_MARKER = Marker.Disc;

  private readonly _gl: WebGL2RenderingContext;
  private readonly _pointsShaderProgram: WebGLProgram;
  private readonly _pointsShaderBuffers: {
    a_x: WebGLBuffer;
    a_y: WebGLBuffer;
    a_size: WebGLBuffer;
    a_color: WebGLBuffer;
    a_opacity: WebGLBuffer;
    a_markerIndex: WebGLBuffer;
    a_transformIndex: WebGLBuffer;
  };

  constructor(canvas: HTMLCanvasElement) {
    this._gl = WebGLContext._initGL(canvas);
    this._pointsShaderProgram = this._loadShaderProgram(
      pointsVertexShaderSource,
      pointsFragmentShaderSource,
    );
    this._pointsShaderBuffers = {
      a_x: this._gl.createBuffer(),
      a_y: this._gl.createBuffer(),
      a_size: this._gl.createBuffer(),
      a_color: this._gl.createBuffer(),
      a_opacity: this._gl.createBuffer(),
      a_markerIndex: this._gl.createBuffer(),
      a_transformIndex: this._gl.createBuffer(),
    };
  }

  async synchronizePoints(
    layerMap: Map<string, ILayerModel>,
    pointsMap: Map<string, IPointsModel>,
    loadPoints: (points: IPointsModel) => Promise<IPointsData>,
    loadTableByID: (tableId: string) => Promise<ITableData>,
    checkAbort: () => boolean,
  ): Promise<void> {
    let pointsIndex = 0;
    const xsList = [];
    const ysList = [];
    const sizesList = [];
    const colorsList = [];
    const opacitiesList = [];
    const markerIndicesList = [];
    const transformIndicesList = [];
    for (const layer of layerMap.values()) {
      for (const points of pointsMap.values()) {
        for (const layerConfig of points.layerConfigs.filter(
          (layerConfig) => layerConfig.layerId === layer.id,
        )) {
          let pointsData = null;
          try {
            pointsData = await loadPoints(points);
          } catch (error) {
            console.error(`Failed to load points with ID ${points.id}`, error);
          }
          if (checkAbort()) {
            return;
          }
          if (pointsData !== null) {
            // x/y
            const [xs, ys] = await pointsData.loadPositions(
              layerConfig.pointXDimension,
              layerConfig.pointYDimension,
            );
            if (checkAbort()) {
              return;
            }
            xsList.push(xs);
            ysList.push(ys);
            // sizes
            const sizes = new Float32Array(xs.length);
            if (typeof points.pointSize === "number") {
              sizes.fill(points.pointSize);
            } else if (isTableValuesColumn(points.pointSize)) {
              const tableData = await loadTableByID(points.pointSize.tableId);
              const tableValues = await tableData.loadColumn<number>(
                points.pointSize.valuesCol,
              );
              if (checkAbort()) {
                return;
              }
              sizes.set(tableValues);
            } else if (isTableGroupsColumn(points.pointSize)) {
              // TODO
            } else {
              sizes.fill(WebGLContext._DEFAULT_POINT_SIZE);
            }
            sizesList.push(sizes);
            // colors
            const colors = new Float32Array(xs.length * 3);
            if (isColor(points.pointColor)) {
              ArrayUtils.fillSeq(colors, [
                points.pointColor.r,
                points.pointColor.g,
                points.pointColor.b,
              ]);
            } else if (isTableValuesColumn(points.pointColor)) {
              const tableData = await loadTableByID(points.pointColor.tableId);
              const tableValues = await tableData.loadColumn<string>(
                points.pointColor.valuesCol,
              );
              if (checkAbort()) {
                return;
              }
              for (let i = 0; i < tableValues.length; i++) {
                let color = WebGLContext._DEFAULT_POINT_COLOR;
                try {
                  color = ColorUtils.parseHex(tableValues[i]);
                } catch (error) {
                  console.error(`Invalid color: ${tableValues[i]}`, error);
                }
                colors.set([color.r, color.g, color.b], i * 3);
              }
            } else if (isTableGroupsColumn(points.pointColor)) {
              // TODO
            } else {
              ArrayUtils.fillSeq(colors, [
                WebGLContext._DEFAULT_POINT_COLOR.r,
                WebGLContext._DEFAULT_POINT_COLOR.g,
                WebGLContext._DEFAULT_POINT_COLOR.b,
              ]);
            }
            colorsList.push(colors);
            // opacities
            const opacities = new Float32Array(xs.length);
            if (typeof points.pointOpacity === "number") {
              opacities.fill(points.pointOpacity);
            } else if (isTableValuesColumn(points.pointOpacity)) {
              const tableData = await loadTableByID(
                points.pointOpacity.tableId,
              );
              const tableValues = await tableData.loadColumn<number>(
                points.pointOpacity.valuesCol,
              );
              if (checkAbort()) {
                return;
              }
              opacities.set(tableValues);
            } else if (isTableGroupsColumn(points.pointOpacity)) {
              // TODO
            } else {
              opacities.fill(WebGLContext._DEFAULT_POINT_OPACITY);
            }
            opacitiesList.push(opacities);
            // marker indices
            const markerIndices = new Uint32Array(xs.length);
            if (isMarker(points.pointMarker)) {
              markerIndices.fill(points.pointMarker);
            } else if (isTableValuesColumn(points.pointMarker)) {
              const tableData = await loadTableByID(points.pointMarker.tableId);
              const tableValues = await tableData.loadColumn<number>(
                points.pointMarker.valuesCol,
              );
              if (checkAbort()) {
                return;
              }
              markerIndices.set(tableValues);
            } else if (isTableGroupsColumn(points.pointMarker)) {
              // TODO
            } else {
              markerIndices.fill(WebGLContext._DEFAULT_POINT_MARKER);
            }
            markerIndicesList.push(markerIndices);
            // transform indices
            const transformIndices = new Uint32Array(xs.length).fill(
              pointsIndex,
            );
            transformIndicesList.push(transformIndices);
            pointsIndex++;
          }
        }
      }
    }
    this._loadArrayBufferData(this._pointsShaderBuffers.a_x, xsList);
    this._loadArrayBufferData(this._pointsShaderBuffers.a_y, ysList);
    this._loadArrayBufferData(this._pointsShaderBuffers.a_size, sizesList);
    this._loadArrayBufferData(this._pointsShaderBuffers.a_color, colorsList);
    this._loadArrayBufferData(
      this._pointsShaderBuffers.a_opacity,
      opacitiesList,
    );
    this._loadArrayBufferData(
      this._pointsShaderBuffers.a_markerIndex,
      markerIndicesList,
    );
    this._loadArrayBufferData(
      this._pointsShaderBuffers.a_transformIndex,
      transformIndicesList,
    );
  }

  async synchronizeShapes(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _layerMap: Map<string, ILayerModel>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _shapesMap: Map<string, IShapesModel>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _loadShapes: (shapes: IShapesModel) => Promise<IShapesData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _loadTableByID: (tableId: string) => Promise<ITableData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _checkAbort: () => boolean,
  ): Promise<void> {
    // TODO
  }

  destroy(): void {
    this._gl.deleteProgram(this._pointsShaderProgram);
    for (const pointsShaderBuffer of Object.values(this._pointsShaderBuffers)) {
      this._gl.deleteBuffer(pointsShaderBuffer);
    }
  }

  private static _initGL(canvas: HTMLCanvasElement): WebGL2RenderingContext {
    const gl = canvas.getContext("webgl2", WebGLContext._GL_OPTIONS);
    if (gl === null) {
      throw new Error("WebGL 2.0 is not supported by the browser.");
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    return gl;
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

  private _loadArrayBufferData<
    T extends Float32Array | Int32Array | Uint32Array,
  >(buffer: WebGLBuffer, dataList: T[]): void {
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, buffer);
    this._gl.bufferData(
      this._gl.ARRAY_BUFFER,
      dataList.reduce((sum, data) => sum + data.byteLength, 0),
      this._gl.STATIC_DRAW,
    );
    let offset = 0;
    for (const data of dataList) {
      this._gl.bufferSubData(this._gl.ARRAY_BUFFER, offset, data);
      offset += data.byteLength;
    }
  }
}

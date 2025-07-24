import { mat3 } from "gl-matrix";

import { IPointsData } from "../data/points";
import { IShapesData } from "../data/shapes";
import { ITableData } from "../data/table";
import { ILayerConfigModel } from "../models/base";
import { ILayerModel } from "../models/layer";
import { IPointsLayerConfigModel, IPointsModel } from "../models/points";
import { IShapesModel } from "../models/shapes";
import {
  Color,
  Marker,
  TableGroupsColumn,
  TableValuesColumn,
  isColor,
  isMarker,
  isTableGroupsColumn,
  isTableValuesColumn,
} from "../models/types";
import ArrayUtils from "../utils/ArrayUtils";
import ColorUtils from "../utils/ColorUtils";
import WebGLUtils from "../utils/WebGLUtils";
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

  getContext(): WebGLContext {
    return this._context;
  }

  destroy(): void {
    this._context.destroy();
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
  private static readonly _DEFAULT_POINT_SIZE = 1.0;
  private static readonly _DEFAULT_POINT_COLOR: Color = {
    r: 0,
    g: 0,
    b: 0,
  };
  private static readonly _DEFAULT_POINT_OPACITY = 1.0;
  private static readonly _DEFAULT_POINT_MARKER = Marker.Disc;
  private static readonly _POINTS_ATTRIB_LOCATIONS = {
    X: 0,
    Y: 1,
    SIZE: 2,
    COLOR: 3,
    OPACITY: 4,
    MARKER_INDEX: 5,
    TRANSFORM_INDEX: 6,
  };

  private readonly _gl: WebGL2RenderingContext;
  private readonly _pointsProgram: WebGLProgram;
  private readonly _pointsUniformLocations: {
    transformsUBO: GLuint;
    viewTransform: WebGLUniformLocation;
    markerAtlas: WebGLUniformLocation;
  };
  private readonly _pointsBuffers: {
    x: WebGLBuffer;
    y: WebGLBuffer;
    size: WebGLBuffer;
    color: WebGLBuffer;
    opacity: WebGLBuffer;
    markerIndex: WebGLBuffer;
    transformIndex: WebGLBuffer;
  };
  private readonly _pointsVAO: WebGLVertexArrayObject;
  private readonly _pointsStates: PointsState[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this._gl = WebGLUtils.init(canvas, {
      antialias: false,
      preserveDrawingBuffer: true,
    });
    this._pointsProgram = WebGLUtils.loadProgram(
      this._gl,
      pointsVertexShaderSource,
      pointsFragmentShaderSource,
    );
    this._pointsUniformLocations = {
      transformsUBO: this._gl.getUniformBlockIndex(
        this._pointsProgram,
        "TransformsUBO",
      ),
      viewTransform:
        this._gl.getUniformLocation(this._pointsProgram, "u_viewTransform") ||
        (() => {
          throw new Error("Failed to get uniform location for u_viewTransform");
        })(),
      markerAtlas:
        this._gl.getUniformLocation(this._pointsProgram, "u_markerAtlas") ||
        (() => {
          throw new Error("Failed to get uniform location for u_markerAtlas");
        })(),
    };
    this._pointsBuffers = {
      x: this._gl.createBuffer(),
      y: this._gl.createBuffer(),
      size: this._gl.createBuffer(),
      color: this._gl.createBuffer(),
      opacity: this._gl.createBuffer(),
      markerIndex: this._gl.createBuffer(),
      transformIndex: this._gl.createBuffer(),
    };
    this._pointsVAO = this._createPointsVAO();
  }

  async synchronizePoints(
    layerMap: Map<string, ILayerModel>,
    pointsMap: Map<string, IPointsModel>,
    loadPoints: (points: IPointsModel) => Promise<IPointsData>,
    loadTableByID: (tableId: string) => Promise<ITableData>,
    checkAbort: () => boolean,
  ): Promise<boolean> {
    const createPointsStatesResult = await this._createPointsStates(
      layerMap,
      pointsMap,
      loadPoints,
      checkAbort,
    );
    if (createPointsStatesResult === null) {
      return false;
    }
    const [newPointsStates, xsList, ysList] = createPointsStatesResult;
    let pointsBuffersResized = false;
    const n = newPointsStates.reduce((s, x) => s + x.n, 0);
    if (this._pointsStates.reduce((s, x) => s + x.n, 0) !== n) {
      this._resizePointsBuffers(n);
      pointsBuffersResized = true;
    }
    const pointsStatesLoaded = await this._loadPointsStates(
      newPointsStates,
      pointsBuffersResized,
      loadTableByID,
      checkAbort,
      xsList,
      ysList,
    );
    if (!pointsStatesLoaded) {
      return false;
    }
    this._drawPoints(n);
    return true;
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
  ): Promise<boolean> {
    // TODO
    return await Promise.resolve(true);
  }

  destroy(): void {
    this._gl.deleteProgram(this._pointsProgram);
    for (const pointsBuffer of Object.values(this._pointsBuffers)) {
      this._gl.deleteBuffer(pointsBuffer);
    }
  }

  private async _createPointsStates(
    layerMap: Map<string, ILayerModel>,
    pointsMap: Map<string, IPointsModel>,
    loadPoints: (points: IPointsModel) => Promise<IPointsData>,
    checkAbort: () => boolean,
  ): Promise<[PointsState[], Float32Array[], Float32Array[]] | null> {
    let offset = 0;
    const newPointsStates = [];
    const xsList = [];
    const ysList = [];
    for (const layer of layerMap.values()) {
      for (const points of pointsMap.values()) {
        for (const layerConfig of points.layerConfigs.filter(
          (layerConfig) => layerConfig.layerId === layer.id,
        )) {
          let data = null;
          try {
            data = await loadPoints(points);
          } catch (error) {
            console.error(`Failed to load points with ID ${points.id}`, error);
          }
          if (checkAbort()) {
            return null;
          }
          if (data !== null) {
            const [xs, ys] = await data.loadPositions(
              layerConfig.pointXDimension,
              layerConfig.pointYDimension,
            );
            if (checkAbort()) {
              return null;
            }
            newPointsStates.push({
              layer: layer,
              points: points,
              layerConfig: layerConfig,
              data: data,
              config: {
                pointXDimension: layerConfig.pointXDimension,
                pointYDimension: layerConfig.pointYDimension,
                pointSize: points.pointSize,
                pointColor: points.pointColor,
                pointOpacity: points.pointOpacity,
                pointMarker: points.pointMarker,
              },
              n: xs.length,
              offset: offset,
            });
            xsList.push(xs);
            ysList.push(ys);
            offset += xs.length;
          }
        }
      }
    }
    return [newPointsStates, xsList, ysList];
  }

  private _resizePointsBuffers(n: number): void {
    WebGLUtils.resizeBuffer(
      this._gl,
      this._pointsBuffers.x,
      n * Float32Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._pointsBuffers.y,
      n * Float32Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._pointsBuffers.size,
      n * Float16Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._pointsBuffers.color,
      n * 3 * Uint8Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._pointsBuffers.opacity,
      n * Float16Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._pointsBuffers.markerIndex,
      n * Uint8Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._pointsBuffers.transformIndex,
      n * Uint8Array.BYTES_PER_ELEMENT,
    );
  }

  private async _loadPointsStates(
    newPointsStates: PointsState[],
    pointsBuffersResized: boolean,
    loadTableByID: (tableId: string) => Promise<ITableData>,
    checkAbort: () => boolean,
    xsList: Float32Array[],
    ysList: Float32Array[],
  ): Promise<boolean> {
    let i = 0;
    for (const newPointsState of newPointsStates) {
      const currentPointsState =
        i < this._pointsStates.length ? this._pointsStates[i] : null;
      const pointsBufferDataChanged =
        pointsBuffersResized ||
        currentPointsState === null ||
        currentPointsState.points !== newPointsState.points ||
        currentPointsState.layerConfig !== newPointsState.layerConfig ||
        currentPointsState.data !== newPointsState.data ||
        currentPointsState.n !== newPointsState.n ||
        currentPointsState.offset !== newPointsState.offset;
      // xs
      if (
        pointsBufferDataChanged ||
        currentPointsState.config.pointXDimension !==
          newPointsState.layerConfig.pointXDimension
      ) {
        WebGLUtils.loadBufferData(
          this._gl,
          this._pointsBuffers.x,
          xsList[i],
          newPointsState.offset,
        );
      }
      // ys
      if (
        pointsBufferDataChanged ||
        currentPointsState.config.pointYDimension !==
          newPointsState.layerConfig.pointYDimension
      ) {
        WebGLUtils.loadBufferData(
          this._gl,
          this._pointsBuffers.y,
          ysList[i],
          newPointsState.offset,
        );
      }
      // sizes
      if (
        pointsBufferDataChanged ||
        currentPointsState.config.pointSize !== newPointsState.points.pointSize
      ) {
        const sizes = new Float16Array(newPointsState.n);
        if (typeof newPointsState.points.pointSize === "number") {
          sizes.fill(newPointsState.points.pointSize);
        } else if (isTableValuesColumn(newPointsState.points.pointSize)) {
          const tableData = await loadTableByID(
            newPointsState.points.pointSize.tableId,
          );
          const sizeValues = await tableData.loadColumn<number>(
            newPointsState.points.pointSize.valuesCol,
          );
          if (checkAbort()) {
            return false;
          }
          sizes.set(sizeValues);
        } else if (isTableGroupsColumn(newPointsState.points.pointSize)) {
          // TODO
        } else {
          sizes.fill(WebGLContext._DEFAULT_POINT_SIZE);
        }
        WebGLUtils.loadBufferData(
          this._gl,
          this._pointsBuffers.size,
          sizes,
          newPointsState.offset,
        );
      }
      // colors
      if (
        pointsBufferDataChanged ||
        currentPointsState.config.pointColor !==
          newPointsState.points.pointColor
      ) {
        const colors = new Uint8Array(newPointsState.n * 3);
        if (isColor(newPointsState.points.pointColor)) {
          ArrayUtils.fillSeq(colors, [
            newPointsState.points.pointColor.r,
            newPointsState.points.pointColor.g,
            newPointsState.points.pointColor.b,
          ]);
        } else if (isTableValuesColumn(newPointsState.points.pointColor)) {
          const tableData = await loadTableByID(
            newPointsState.points.pointColor.tableId,
          );
          const colorValues = await tableData.loadColumn<string>(
            newPointsState.points.pointColor.valuesCol,
          );
          if (checkAbort()) {
            return false;
          }
          for (let i = 0; i < colorValues.length; i++) {
            let color = WebGLContext._DEFAULT_POINT_COLOR;
            try {
              color = ColorUtils.parseHex(colorValues[i]);
            } catch (error) {
              console.error(`Invalid color: ${colorValues[i]}`, error);
            }
            colors.set([color.r, color.g, color.b], i * 3);
          }
        } else if (isTableGroupsColumn(newPointsState.points.pointColor)) {
          // TODO
        } else {
          ArrayUtils.fillSeq(colors, [
            WebGLContext._DEFAULT_POINT_COLOR.r,
            WebGLContext._DEFAULT_POINT_COLOR.g,
            WebGLContext._DEFAULT_POINT_COLOR.b,
          ]);
        }
        WebGLUtils.loadBufferData(
          this._gl,
          this._pointsBuffers.color,
          colors,
          newPointsState.offset * 3,
        );
      }
      // opacities
      if (
        pointsBufferDataChanged ||
        currentPointsState.config.pointOpacity !==
          newPointsState.points.pointOpacity
      ) {
        const opacities = new Float16Array(newPointsState.n);
        if (typeof newPointsState.points.pointOpacity === "number") {
          opacities.fill(newPointsState.points.pointOpacity);
        } else if (isTableValuesColumn(newPointsState.points.pointOpacity)) {
          const tableData = await loadTableByID(
            newPointsState.points.pointOpacity.tableId,
          );
          const opacityValues = await tableData.loadColumn<number>(
            newPointsState.points.pointOpacity.valuesCol,
          );
          if (checkAbort()) {
            return false;
          }
          opacities.set(opacityValues);
        } else if (isTableGroupsColumn(newPointsState.points.pointOpacity)) {
          // TODO
        } else {
          opacities.fill(WebGLContext._DEFAULT_POINT_OPACITY);
        }
        WebGLUtils.loadBufferData(
          this._gl,
          this._pointsBuffers.opacity,
          opacities,
          newPointsState.offset,
        );
      }
      // marker indices
      if (
        pointsBufferDataChanged ||
        currentPointsState.config.pointMarker !==
          newPointsState.points.pointMarker
      ) {
        const markerIndices = new Uint8Array(newPointsState.n);
        if (isMarker(newPointsState.points.pointMarker)) {
          markerIndices.fill(newPointsState.points.pointMarker);
        } else if (isTableValuesColumn(newPointsState.points.pointMarker)) {
          const tableData = await loadTableByID(
            newPointsState.points.pointMarker.tableId,
          );
          const markerIndexValues = await tableData.loadColumn<number>(
            newPointsState.points.pointMarker.valuesCol,
          );
          if (checkAbort()) {
            return false;
          }
          markerIndices.set(markerIndexValues);
        } else if (isTableGroupsColumn(newPointsState.points.pointMarker)) {
          // TODO
        } else {
          markerIndices.fill(WebGLContext._DEFAULT_POINT_MARKER);
        }
        WebGLUtils.loadBufferData(
          this._gl,
          this._pointsBuffers.markerIndex,
          markerIndices,
          newPointsState.offset,
        );
      }
      // transform indices
      if (pointsBufferDataChanged) {
        const transformIndices = new Uint8Array(newPointsState.n).fill(i);
        WebGLUtils.loadBufferData(
          this._gl,
          this._pointsBuffers.transformIndex,
          transformIndices,
          newPointsState.offset,
        );
      }
      if (i < this._pointsStates.length) {
        this._pointsStates[i] = newPointsState;
      } else {
        this._pointsStates.push(newPointsState);
      }
      i++;
    }
    return true;
  }

  _drawPoints(n: number): void {
    // TODO blending
    this._gl.useProgram(this._pointsProgram);
    this._gl.bindVertexArray(this._pointsVAO);
    this._gl.uniformBlockBinding(
      this._pointsProgram,
      this._pointsUniformLocations.transformsUBO,
      0,
    );
    this._gl.bindBufferBase(
      this._gl.UNIFORM_BUFFER,
      0,
      this._createPointsTransforms(),
    );
    this._gl.uniformMatrix3fv(
      this._pointsUniformLocations.viewTransform,
      false,
      this._createViewTransform(),
    );
    // TODO
    // this._gl.activeTexture(this._gl.TEXTURE0);
    // this._gl.bindTexture(this._gl.TEXTURE_2D, this._pointsMarkerAtlasTexture);
    this._gl.uniform1i(this._pointsUniformLocations.markerAtlas, 0);
    this._gl.drawArrays(this._gl.POINTS, 0, n);
    this._gl.bindVertexArray(null);
    this._gl.useProgram(null);
  }

  private _createPointsVAO(): WebGLVertexArrayObject {
    const pointsVAO = this._gl.createVertexArray();
    this._gl.bindVertexArray(pointsVAO);
    WebGLUtils.configureVertexAttribute(
      this._gl,
      WebGLContext._POINTS_ATTRIB_LOCATIONS.X,
      this._pointsBuffers.x,
      this._gl.FLOAT,
    );
    WebGLUtils.configureVertexAttribute(
      this._gl,
      WebGLContext._POINTS_ATTRIB_LOCATIONS.Y,
      this._pointsBuffers.y,
      this._gl.FLOAT,
    );
    WebGLUtils.configureVertexAttribute(
      this._gl,
      WebGLContext._POINTS_ATTRIB_LOCATIONS.SIZE,
      this._pointsBuffers.size,
      this._gl.HALF_FLOAT,
    );
    WebGLUtils.configureVertexAttribute(
      this._gl,
      WebGLContext._POINTS_ATTRIB_LOCATIONS.COLOR,
      this._pointsBuffers.color,
      this._gl.UNSIGNED_BYTE,
      true,
      3,
    );
    WebGLUtils.configureVertexAttribute(
      this._gl,
      WebGLContext._POINTS_ATTRIB_LOCATIONS.OPACITY,
      this._pointsBuffers.opacity,
      this._gl.HALF_FLOAT,
      true,
    );
    WebGLUtils.configureVertexAttribute(
      this._gl,
      WebGLContext._POINTS_ATTRIB_LOCATIONS.MARKER_INDEX,
      this._pointsBuffers.markerIndex,
      this._gl.UNSIGNED_BYTE,
      "int",
    );
    WebGLUtils.configureVertexAttribute(
      this._gl,
      WebGLContext._POINTS_ATTRIB_LOCATIONS.TRANSFORM_INDEX,
      this._pointsBuffers.transformIndex,
      this._gl.UNSIGNED_BYTE,
      "int",
    );
    this._gl.bindVertexArray(null);
    return pointsVAO;
  }

  private _createPointsTransforms(): Float32Array {
    const pointsTransforms = new Float32Array(this._pointsStates.length * 9);
    for (let i = 0; i < this._pointsStates.length; i++) {
      const pointsState = this._pointsStates[i];
      const transform = WebGLContext._createTransform(
        pointsState.layer,
        pointsState.layerConfig,
      );
      pointsTransforms.set(transform, i * 9);
    }
    return pointsTransforms;
  }

  private _createViewTransform(): Float32Array {
    // TODO
    throw new Error("View transform creation not implemented");
  }

  private static _createTransform(
    layer: ILayerModel,
    layerConfig: ILayerConfigModel,
  ): mat3 {
    const transform = mat3.create();
    if (layerConfig.scale) {
      mat3.scale(transform, transform, [layerConfig.scale, layerConfig.scale]);
    }
    if (layerConfig.flip) {
      mat3.scale(transform, transform, [-1, 1]);
    }
    if (layerConfig.rotation) {
      mat3.rotate(transform, transform, (layerConfig.rotation * Math.PI) / 180);
    }
    if (layerConfig.translation) {
      mat3.translate(transform, transform, [
        layerConfig.translation.x,
        layerConfig.translation.y,
      ]);
    }
    if (layer.scale) {
      mat3.scale(transform, transform, [layer.scale, layer.scale]);
    }
    if (layer.translation) {
      mat3.translate(transform, transform, [
        layer.translation.x,
        layer.translation.y,
      ]);
    }
    return transform;
  }
}

type BaseState = {
  n: number;
  offset: number;
};

type PointsState = BaseState & {
  layer: ILayerModel;
  points: IPointsModel;
  layerConfig: IPointsLayerConfigModel;
  data: IPointsData;
  config: {
    pointXDimension: string;
    pointYDimension: string;
    pointSize?: number | TableValuesColumn | TableGroupsColumn;
    pointColor?: Color | TableValuesColumn | TableGroupsColumn;
    pointOpacity?: number | TableValuesColumn | TableGroupsColumn;
    pointMarker?: Marker | TableValuesColumn | TableGroupsColumn;
  };
};

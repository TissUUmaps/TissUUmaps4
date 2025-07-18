import { IPointsData } from "../data/points";
import { IShapesData } from "../data/shapes";
import { ITableData } from "../data/table";
import { TypedArray } from "../data/types";
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
    r: 0.0,
    g: 0.0,
    b: 0.0,
  };
  private static readonly _DEFAULT_POINT_OPACITY = 1.0;
  private static readonly _DEFAULT_POINT_MARKER = Marker.Disc;

  private readonly _gl: WebGL2RenderingContext;
  private readonly _pointsProgram: WebGLProgram;
  private readonly _pointsBuffers: {
    a_x: WebGLBuffer;
    a_y: WebGLBuffer;
    a_size: WebGLBuffer;
    a_color: WebGLBuffer;
    a_opacity: WebGLBuffer;
    a_markerIndex: WebGLBuffer;
    a_transformIndex: WebGLBuffer;
  };
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
    this._pointsBuffers = {
      a_x: this._gl.createBuffer(),
      a_y: this._gl.createBuffer(),
      a_size: this._gl.createBuffer(),
      a_color: this._gl.createBuffer(),
      a_opacity: this._gl.createBuffer(),
      a_markerIndex: this._gl.createBuffer(),
      a_transformIndex: this._gl.createBuffer(),
    };
  }

  // TODO u_markerAtlas
  // TODO u_viewTransform
  // TODO draw

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
    return await this._updatePointsBuffers(
      newPointsStates,
      pointsBuffersResized,
      loadTableByID,
      checkAbort,
      xsList,
      ysList,
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
              n: xs.length,
              offset: offset,
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
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._pointsBuffers.a_x);
    this._gl.bufferData(
      this._gl.ARRAY_BUFFER,
      n * Float32Array.BYTES_PER_ELEMENT,
      this._gl.STATIC_DRAW,
    );
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._pointsBuffers.a_y);
    this._gl.bufferData(
      this._gl.ARRAY_BUFFER,
      n * Float32Array.BYTES_PER_ELEMENT,
      this._gl.STATIC_DRAW,
    );
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._pointsBuffers.a_size);
    this._gl.bufferData(
      this._gl.ARRAY_BUFFER,
      n * Float32Array.BYTES_PER_ELEMENT,
      this._gl.STATIC_DRAW,
    );
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._pointsBuffers.a_color);
    this._gl.bufferData(
      this._gl.ARRAY_BUFFER,
      3 * n * Float32Array.BYTES_PER_ELEMENT,
      this._gl.STATIC_DRAW,
    );
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._pointsBuffers.a_opacity);
    this._gl.bufferData(
      this._gl.ARRAY_BUFFER,
      n * Float32Array.BYTES_PER_ELEMENT,
      this._gl.STATIC_DRAW,
    );
    this._gl.bindBuffer(
      this._gl.ARRAY_BUFFER,
      this._pointsBuffers.a_markerIndex,
    );
    this._gl.bufferData(
      this._gl.ARRAY_BUFFER,
      n * Uint32Array.BYTES_PER_ELEMENT,
      this._gl.STATIC_DRAW,
    );
    this._gl.bindBuffer(
      this._gl.ARRAY_BUFFER,
      this._pointsBuffers.a_transformIndex,
    );
    this._gl.bufferData(
      this._gl.ARRAY_BUFFER,
      n * Uint32Array.BYTES_PER_ELEMENT,
      this._gl.STATIC_DRAW,
    );
  }

  private async _updatePointsBuffers(
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
      // x
      if (
        pointsBufferDataChanged ||
        currentPointsState.config.pointXDimension !==
          newPointsState.layerConfig.pointXDimension
      ) {
        this._loadBufferData(
          this._pointsBuffers.a_x,
          xsList[i],
          newPointsState.offset,
        );
      }
      // y
      if (
        pointsBufferDataChanged ||
        currentPointsState.config.pointYDimension !==
          newPointsState.layerConfig.pointYDimension
      ) {
        this._loadBufferData(
          this._pointsBuffers.a_y,
          ysList[i],
          newPointsState.offset,
        );
      }
      // size
      if (
        pointsBufferDataChanged ||
        currentPointsState.config.pointSize !== newPointsState.points.pointSize
      ) {
        const sizes = new Float32Array(newPointsState.n);
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
        this._loadBufferData(
          this._pointsBuffers.a_size,
          sizes,
          newPointsState.offset,
        );
      }
      // color
      if (
        pointsBufferDataChanged ||
        currentPointsState.config.pointColor !==
          newPointsState.points.pointColor
      ) {
        const colors = new Float32Array(newPointsState.n * 3);
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
        this._loadBufferData(
          this._pointsBuffers.a_color,
          colors,
          newPointsState.offset * 3,
        );
      }
      // opacity
      if (
        pointsBufferDataChanged ||
        currentPointsState.config.pointOpacity !==
          newPointsState.points.pointOpacity
      ) {
        const opacities = new Float32Array(newPointsState.n);
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
        this._loadBufferData(
          this._pointsBuffers.a_opacity,
          opacities,
          newPointsState.offset,
        );
      }
      // marker
      if (
        pointsBufferDataChanged ||
        currentPointsState.config.pointMarker !==
          newPointsState.points.pointMarker
      ) {
        const markerIndices = new Uint32Array(newPointsState.n);
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
        this._loadBufferData(
          this._pointsBuffers.a_markerIndex,
          markerIndices,
          newPointsState.offset,
        );
      }
      // transform
      if (pointsBufferDataChanged) {
        const transformIndices = new Uint32Array(newPointsState.n).fill(i);
        this._loadBufferData(
          this._pointsBuffers.a_transformIndex,
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
    // TODO u_transforms
    return true;
  }

  private _loadBufferData(
    buffer: WebGLBuffer,
    data: TypedArray,
    offset: number = 0,
    target: GLenum = this._gl.ARRAY_BUFFER,
  ): void {
    this._gl.bindBuffer(target, buffer);
    this._gl.bufferSubData(target, offset * data.BYTES_PER_ELEMENT, data);
  }
}

type BaseState = {
  n: number;
  offset: number;
};

type PointsState = BaseState & {
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

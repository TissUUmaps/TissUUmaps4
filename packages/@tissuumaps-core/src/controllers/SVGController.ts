import {
  type InteractionMode,
  type MultiPolygon,
  type Rect,
  type Vertex,
} from "../types";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

type RectangleDrawingState = {
  startPoint: Vertex;
  currentRect: SVGRectElement;
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type PolygonDrawingState = {
  // TODO extend for polygon drawing
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type FreehandDrawingState = {
  // TODO extend for freehand drawing
};

/**
 * Controller for managing the drawing of SVG shapes
 */
export class SVGController {
  public readonly container: SVGSVGElement;
  public readonly transformNode: SVGGElement;
  public readonly shapeCompleteHandler?: (shape: MultiPolygon) => void;
  private static readonly _previewFillColor = "rgba(255, 0, 0, 0.2)";
  private static readonly _previewStrokeColor = "#FF0000";
  private static readonly _previewStrokeWidthFactor = 0.0005;
  private static readonly _minShapeSizeFactor = 0.001;
  private _containerSize: { width: number; height: number };
  private _viewport: Rect;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore currently not used, but will be needed in the future
  private _interactionMode?: InteractionMode;

  private _rectangleDrawingState: RectangleDrawingState | null = null;

  // @ts-expect-error currently not used
  private _polygonDrawingState: PolygonDrawingState | null = null;

  // @ts-expect-error currently not used
  private _freehandDrawingState: FreehandDrawingState | null = null;

  /** Creates a positioned, full-size `<svg>` element for the SVG overlay */
  static createContainer(): SVGSVGElement {
    const container = document.createElementNS(SVG_NAMESPACE, "svg");
    container.style.position = "absolute";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    return container;
  }

  /**
   * @param container - The `<svg>` element to draw on (typically created by {@link createContainer})
   * @param initialViewport - Initial world-space viewport rectangle
   * @param options - Optional shape drawing event handlers
   */
  constructor(
    container: SVGSVGElement,
    initialViewport: Rect,
    options?: { onShapeComplete?: (shape: MultiPolygon) => void },
  ) {
    this.container = container;
    this.transformNode = document.createElementNS(SVG_NAMESPACE, "g");
    this.shapeCompleteHandler = options?.onShapeComplete;
    container.replaceChildren(this.transformNode);
    this._containerSize = container.getBoundingClientRect();
    this._viewport = initialViewport;
    this._updateTransformNode();

    this._registerEventHandlers();
  }

  /**
   * Updates the world-space viewport rectangle
   *
   * @param newViewport - New viewport bounds in world coordinates
   * @returns `true` if the viewport actually changed, `false` otherwise
   */
  setViewport(newViewport: Rect): boolean {
    if (
      this._viewport.x !== newViewport.x ||
      this._viewport.y !== newViewport.y ||
      this._viewport.width !== newViewport.width ||
      this._viewport.height !== newViewport.height
    ) {
      this._viewport = newViewport;
      this._updateTransformNode();
      return true;
    }
    return false;
  }

  /**
   * Updates the interaction mode
   *
   * @param newInteractionMode - New interaction mode
   */
  setInteractionMode(newInteractionMode: InteractionMode) {
    this._interactionMode = newInteractionMode;
  }

  /**
   * Resizes the SVG container to match the given screen-space dimensions,
   * accounting for `devicePixelRatio`
   *
   * @param newContainerSize - Desired container size in screen-space pixels
   * @returns `true` if the container size actually changed, `false` otherwise
   */
  resizeContainer(newContainerSize: {
    width: number;
    height: number;
  }): boolean {
    let { width, height } = newContainerSize;
    width *= window.devicePixelRatio;
    height *= window.devicePixelRatio;
    if (width <= 0 || height <= 0) {
      width = 1;
      height = 1;
    }
    if (
      this._containerSize.width !== width ||
      this._containerSize.height !== height
    ) {
      this._containerSize = { width, height };
      this.container.setAttribute("width", width.toString());
      this.container.setAttribute("height", height.toString());
      this._updateTransformNode();
      return true;
    }
    return false;
  }

  destroy(): void {
    this._unregisterEventHandlers();
  }

  // ─────────────────────────────────────────────────────────────
  // Event Handling
  // ─────────────────────────────────────────────────────────────

  private _registerEventHandlers(): void {
    this.container.addEventListener("pointerdown", this._handlePointerDown);
  }

  private _unregisterEventHandlers(): void {
    this.container.removeEventListener("pointerdown", this._handlePointerDown);
  }

  // Main handler for pointer down events; delegates to specific handlers based on the current interaction mode
  private _handlePointerDown = (event: PointerEvent): void => {
    if (event.shiftKey || event.button !== 0) return;

    switch (this._interactionMode) {
      case "drawRectangle":
        this._handleRectanglePointerDown(event);
        break;
      case "drawPolygon":
        this._handlePolygonPointerDown(event);
        break;
      case "drawFreehand":
        this._handleFreehandPointerDown(event);
        break;
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Rectangle Drawing
  // ─────────────────────────────────────────────────────────────

  private _handleRectanglePointerDown = (event: PointerEvent): void => {
    document.addEventListener("pointermove", this._handleRectanglePointerMove);
    document.addEventListener("pointerup", this._handleRectanglePointerUp);

    event.preventDefault();
    event.stopPropagation();

    const worldPoint = this._screenToWorld(event.clientX, event.clientY);

    this._rectangleDrawingState = {
      startPoint: worldPoint,
      currentRect: this._createPreviewRect(worldPoint),
    };
  };

  private _handleRectanglePointerMove = (event: PointerEvent): void => {
    if (!this._rectangleDrawingState) return;

    const worldPoint = this._screenToWorld(event.clientX, event.clientY);
    this._updatePreviewRect(
      this._rectangleDrawingState.currentRect,
      this._rectangleDrawingState.startPoint,
      worldPoint,
    );
  };

  private _handleRectanglePointerUp = (event: PointerEvent): void => {
    if (!this._rectangleDrawingState || event.button !== 0) return;

    const worldPoint = this._screenToWorld(event.clientX, event.clientY);

    if (this._rectangleDrawingState.startPoint) {
      const multiPolygon = this._createRectangleMultiPolygon(
        this._rectangleDrawingState.startPoint,
        worldPoint,
      );

      if (
        this._hasMinimumSize(this._rectangleDrawingState.startPoint, worldPoint)
      ) {
        this.shapeCompleteHandler?.(multiPolygon);
      }
    }

    // Remove preview element - WebGL will render the actual shape
    this._rectangleDrawingState.currentRect.remove();
    this._rectangleDrawingState = null;

    document.removeEventListener(
      "pointermove",
      this._handleRectanglePointerMove,
    );
    document.removeEventListener("pointerup", this._handleRectanglePointerUp);
  };

  // ─────────────────────────────────────────────────────────────
  // Polygon drawing
  // ─────────────────────────────────────────────────────────────

  /* eslint-disable @typescript-eslint/no-unused-vars */

  // @ts-expect-error currently not used
  private _handlePolygonPointerDown = (event: PointerEvent): void => {
    // TODO implement polygon drawing logic
    // TODO: Register polygon-specific move/up handlers
    // document.addEventListener("pointermove", this._handlePolygonPointerMove);
    // document.addEventListener("pointerup", this._handlePolygonPointerUp)
  };

  // @ts-expect-error currently not used
  private _handlePolygonPointerMove = (event: PointerEvent): void => {
    // TODO
  };

  // @ts-expect-error currently not used
  private _handlePolygonPointerUp = (event: PointerEvent): void => {
    // TODO
  };

  // ─────────────────────────────────────────────────────────────
  // Freehand Drawing
  // ─────────────────────────────────────────────────────────────

  // @ts-expect-error currently not used
  private _handleFreehandPointerDown = (event: PointerEvent): void => {
    // TODO: Register freehand-specific move/up handlers
    // document.addEventListener("pointermove", this._handleFreehandPointerMove);
    // document.addEventListener("pointerup", this._handleFreehandPointerUp);
  };

  // @ts-expect-error currently not used
  private _handleFreehandPointerMove = (event: PointerEvent): void => {
    // TODO
  };

  // @ts-expect-error currently not used
  private _handleFreehandPointerUp = (event: PointerEvent): void => {
    // TODO
  };

  // ─────────────────────────────────────────────────────────────
  // Drawing Helpers
  // ─────────────────────────────────────────────────────────────

  private _createPreviewRect(startPoint: Vertex): SVGRectElement {
    const rect = document.createElementNS(SVG_NAMESPACE, "rect");
    rect.setAttribute("x", startPoint.x.toString());
    rect.setAttribute("y", startPoint.y.toString());
    rect.setAttribute("width", "0");
    rect.setAttribute("height", "0");
    rect.setAttribute("fill", SVGController._previewFillColor);
    rect.setAttribute("stroke", SVGController._previewStrokeColor);
    rect.setAttribute(
      "stroke-width",
      (
        this._viewport.width * SVGController._previewStrokeWidthFactor
      ).toString(),
    );

    this.transformNode.appendChild(rect);
    return rect;
  }

  private _updatePreviewRect(
    rect: SVGRectElement,
    start: Vertex,
    end: Vertex,
  ): void {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    rect.setAttribute("x", x.toString());
    rect.setAttribute("y", y.toString());
    rect.setAttribute("width", width.toString());
    rect.setAttribute("height", height.toString());
  }

  private _createRectangleMultiPolygon(
    start: Vertex,
    end: Vertex,
  ): MultiPolygon {
    const x0 = Math.min(start.x, end.x);
    const y0 = Math.min(start.y, end.y);
    const x1 = Math.max(start.x, end.x);
    const y1 = Math.max(start.y, end.y);

    return {
      polygons: [
        {
          shell: [
            { x: x0, y: y0 },
            { x: x1, y: y0 },
            { x: x1, y: y1 },
            { x: x0, y: y1 },
          ],
          holes: [],
        },
      ],
    };
  }

  private _hasMinimumSize(start: Vertex, end: Vertex): boolean {
    const minSize = this._viewport.width * SVGController._minShapeSizeFactor; // Adjust threshold as needed
    return (
      Math.abs(end.x - start.x) > minSize && Math.abs(end.y - start.y) > minSize
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Coordinate Transformation
  // ─────────────────────────────────────────────────────────────

  private _screenToWorld(screenX: number, screenY: number): Vertex {
    const ctm = this.transformNode.getScreenCTM();
    if (!ctm) {
      throw new Error("Could not get screen CTM");
    }

    const inverse = ctm.inverse();
    const svgPoint = this.container.createSVGPoint();
    svgPoint.x = screenX;
    svgPoint.y = screenY;

    const worldPoint = svgPoint.matrixTransform(inverse);
    return { x: worldPoint.x, y: worldPoint.y };
  }

  /**
   * Updates the world-to-viewport transform based on the current container size
   * (in screen coordinates) and the current viewport (in world coordinates)
   */
  private _updateTransformNode() {
    const sx = this._containerSize.width / this._viewport.width;
    const sy = this._containerSize.height / this._viewport.height;
    const tx = -this._viewport.x * sx;
    const ty = -this._viewport.y * sy;
    this.transformNode.setAttribute(
      "transform",
      `translate(${tx} ${ty}) scale(${sx} ${sy})`,
    );
  }
}

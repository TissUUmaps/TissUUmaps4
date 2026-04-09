import {
  type InteractionMode,
  type MultiPolygon,
  type Rect,
  type Vertex,
} from "../types";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

interface DrawingState {
  isDrawing: boolean;
  startPoint: Vertex | null;
  currentRect: SVGRectElement | null;
}

/**
 * Controller for managing the drawing of SVG shapes
 */
export class SVGController {
  public readonly container: SVGSVGElement;
  public readonly transformNode: SVGGElement;
  public readonly shapeCompleteHandler?: (shape: MultiPolygon) => void;
  private _containerSize: { width: number; height: number };
  private _viewport: Rect;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore currently not used, but will be needed in the future
  private _interactionMode?: InteractionMode;

  private _drawingState: DrawingState = {
    isDrawing: false,
    startPoint: null,
    currentRect: null,
  };

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
   * @param viewport - Initial world-space viewport rectangle
   * @param options - Optional shape drawing event handlers
   */
  constructor(
    container: SVGSVGElement,
    viewport: Rect,
    options?: { onShapeComplete?: (shape: MultiPolygon) => void },
  ) {
    this.container = container;
    this.transformNode = document.createElementNS(SVG_NAMESPACE, "g");
    this.shapeCompleteHandler = options?.onShapeComplete;
    this._containerSize = {
      width: parseFloat(container.getAttribute("width") ?? "0"),
      height: parseFloat(container.getAttribute("height") ?? "0"),
    };
    this._viewport = viewport;
    container.replaceChildren(this.transformNode);

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

  // TODO implement mouse event handlers for shape drawing; upon shape completion, call shapeCompleteHandler (if defined);
  // mouse coordinates can be transformed to world space coordinates using transformNode.getScreenCTM().inverse()

  // ─────────────────────────────────────────────────────────────
  // Event Handling
  // ─────────────────────────────────────────────────────────────

  private _registerEventHandlers(): void {
    console.debug("Registering SVG event handlers");
    this.container.addEventListener("pointerdown", this._handlePointerDown);
    document.addEventListener("pointermove", this._handlePointerMove);
    document.addEventListener("pointerup", this._handlePointerUp);
  }

  private _unregisterEventHandlers(): void {
    this.container.removeEventListener("pointerdown", this._handlePointerDown);
    document.removeEventListener("pointermove", this._handlePointerMove);
    document.removeEventListener("pointerup", this._handlePointerUp);
  }

  private _handlePointerDown = (event: PointerEvent): void => {
    if (this._interactionMode !== "draw") return;
    if (event.button !== 0) return;
    if (event.shiftKey) {
      // Shift held = don't draw, let instead OpenSeadragon handle panning
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const worldPoint = this._screenToWorld(event.clientX, event.clientY);

    this._drawingState = {
      isDrawing: true,
      startPoint: worldPoint,
      currentRect: this._createPreviewRect(worldPoint),
    };
  };

  private _handlePointerMove = (event: PointerEvent): void => {
    if (!this._drawingState.isDrawing || !this._drawingState.currentRect)
      return;

    const worldPoint = this._screenToWorld(event.clientX, event.clientY);
    this._updatePreviewRect(
      this._drawingState.currentRect,
      this._drawingState.startPoint!,
      worldPoint,
    );
  };

  private _handlePointerUp = (event: PointerEvent): void => {
    if (!this._drawingState.isDrawing || event.button !== 0) return;

    const worldPoint = this._screenToWorld(event.clientX, event.clientY);

    if (this._drawingState.startPoint) {
      const multiPolygon = this._createRectangleMultiPolygon(
        this._drawingState.startPoint,
        worldPoint,
      );

      if (this._hasMinimumSize(this._drawingState.startPoint, worldPoint)) {
        this.shapeCompleteHandler?.(multiPolygon);
      }
    }

    this._finishDrawing();
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
    rect.setAttribute("fill", "rgba(255, 0, 0, 0.2)");
    rect.setAttribute("stroke", "#FF0000");
    rect.setAttribute("stroke-width", "20");
    rect.classList.add("drawing-preview");

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
    const x1 = Math.min(start.x, end.x);
    const y1 = Math.min(start.y, end.y);
    const x2 = Math.max(start.x, end.x);
    const y2 = Math.max(start.y, end.y);

    return {
      polygons: [
        {
          shell: [
            { x: x1, y: y1 },
            { x: x2, y: y1 },
            { x: x2, y: y2 },
            { x: x1, y: y2 },
          ],
          holes: [],
        },
      ],
    };
  }

  private _hasMinimumSize(start: Vertex, end: Vertex): boolean {
    const minSize = this._viewport.width * 0.001; // Adjust threshold as needed
    return (
      Math.abs(end.x - start.x) > minSize && Math.abs(end.y - start.y) > minSize
    );
  }

  private _finishDrawing(): void {
    // Remove preview element - WebGL will render the actual shape
    this._drawingState.currentRect?.remove();
    this._drawingState = {
      isDrawing: false,
      startPoint: null,
      currentRect: null,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Coordinate Transformation
  // ─────────────────────────────────────────────────────────────

  private _screenToWorld(screenX: number, screenY: number): Vertex {
    const ctm = this.transformNode.getScreenCTM();
    if (!ctm) {
      console.warn("Could not get screen CTM");
      return { x: 0, y: 0 };
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

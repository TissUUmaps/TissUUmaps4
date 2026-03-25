import { type InteractionMode, type MultiPolygon, type Rect } from "../types";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

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
    // TODO register mouse event handlers on container
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
      this._containerSize = newContainerSize;
      this.container.setAttribute("width", width.toString());
      this.container.setAttribute("height", height.toString());
      this._updateTransformNode();
      return true;
    }
    return false;
  }

  destroy(): void {}

  // TODO implement mouse event handlers for shape drawing; upon shape completion, call shapeCompleteHandler (if defined);
  // mouse coordinates can be transformed to world space coordinates using transformNode.getScreenCTM().inverse()

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

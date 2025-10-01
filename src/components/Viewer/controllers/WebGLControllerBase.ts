import { mat3 } from "gl-matrix";

import { Rect } from "../../../types";

export default class WebGLControllerBase {
  protected readonly _gl: WebGL2RenderingContext;

  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
  }

  protected static createWorldToViewportMatrix(viewport: Rect): mat3 {
    // gl-matrix, like OpenGL, uses pre-multiplied matrices,
    // so we need to apply transformations in reverse order.
    const m = mat3.create();
    mat3.scale(m, m, [1 / viewport.width, 1 / viewport.height]);
    mat3.translate(m, m, [-viewport.x, -viewport.y]);
    return m;
  }
}

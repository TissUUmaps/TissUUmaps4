import { TypedArray } from "../data/types";

export default class WebGLUtils {
  static init(
    canvas: HTMLCanvasElement,
    options?: WebGLContextAttributes,
  ): WebGL2RenderingContext {
    const gl = canvas.getContext("webgl2", options);
    if (gl === null) {
      throw new Error("WebGL 2.0 is not supported by the browser.");
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    return gl;
  }

  static loadProgram(
    gl: WebGL2RenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string,
  ): WebGLProgram {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (vertexShader === null) {
      throw new Error("Failed to create vertex shader.");
    }
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (fragmentShader === null) {
      throw new Error("Failed to create fragment shader.");
    }
    try {
      const program = gl.createProgram();
      for (const [shader, shaderSource] of [
        [vertexShader, vertexShaderSource],
        [fragmentShader, fragmentShaderSource],
      ] as const) {
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const programInfoLog = gl.getProgramInfoLog(program);
        const vertexShaderInfoLog = gl.getShaderInfoLog(vertexShader);
        const fragmentShaderInfoLog = gl.getShaderInfoLog(fragmentShader);
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
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    }
  }

  static resizeBuffer(
    gl: WebGL2RenderingContext,
    buffer: WebGLBuffer,
    size: GLsizeiptr,
    target?: GLenum,
    usage?: GLenum,
  ): void {
    if (target === undefined) {
      target = gl.ARRAY_BUFFER;
    }
    if (usage === undefined) {
      usage = gl.STATIC_DRAW;
    }
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, size, usage);
    gl.bindBuffer(target, null);
  }

  static loadBufferData(
    gl: WebGL2RenderingContext,
    buffer: WebGLBuffer,
    data: TypedArray,
    offset: number = 0,
    target?: GLenum,
  ): void {
    if (target === undefined) {
      target = gl.ARRAY_BUFFER;
    }
    gl.bindBuffer(target, buffer);
    gl.bufferSubData(target, offset * data.BYTES_PER_ELEMENT, data);
    gl.bindBuffer(target, null);
  }

  static configureVertexAttribute(
    gl: WebGL2RenderingContext,
    index: number,
    buffer: WebGLBuffer,
    type: GLenum,
    normalized: boolean | "int" = false,
    size: number = 1,
    stride: number = 0,
    offset: number = 0,
    divisor: number = 0,
    target?: GLenum,
  ): void {
    if (target === undefined) {
      target = gl.ARRAY_BUFFER;
    }
    gl.bindBuffer(target, buffer);
    gl.enableVertexAttribArray(index);
    if (normalized == "int") {
      gl.vertexAttribIPointer(index, size, type, stride, offset);
    } else {
      gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
    }
    gl.vertexAttribDivisor(index, divisor);
    gl.bindBuffer(target, null);
  }
}

import { TypedArray } from "../types";

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
      if (program === null) {
        throw new Error("Failed to create shader program.");
      }
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

  static getUniformLocation(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    name: string,
  ): WebGLUniformLocation {
    const uniformLocation = gl.getUniformLocation(program, name);
    if (uniformLocation === null) {
      throw new Error(`Failed to get uniform location for ${name}`);
    }
    return uniformLocation;
  }

  static createBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
    const buffer = gl.createBuffer();
    if (buffer === null) {
      throw new Error("Failed to create buffer.");
    }
    return buffer;
  }

  static resizeBuffer(
    gl: WebGL2RenderingContext,
    buffer: WebGLBuffer,
    size: GLsizeiptr,
    target: GLenum = gl.ARRAY_BUFFER,
    usage: GLenum = gl.STATIC_DRAW,
  ): void {
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, size, usage);
    gl.bindBuffer(target, null);
  }

  static createVertexArray(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
    const vao = gl.createVertexArray();
    if (vao === null) {
      throw new Error("Failed to create vertex array object.");
    }
    return vao;
  }

  static configureVertexFloatAttribute(
    gl: WebGL2RenderingContext,
    buffer: WebGLBuffer,
    index: number,
    size: number,
    type: GLenum,
    normalized: boolean = false,
    stride: number = 0,
    offset: number = 0,
    divisor: number = 0,
    target: GLenum = gl.ARRAY_BUFFER,
  ): void {
    gl.bindBuffer(target, buffer);
    gl.enableVertexAttribArray(index);
    gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
    gl.vertexAttribDivisor(index, divisor);
    gl.bindBuffer(target, null);
  }

  static configureVertexIntAttribute(
    gl: WebGL2RenderingContext,
    buffer: WebGLBuffer,
    index: number,
    size: number,
    type: GLenum,
    stride: number = 0,
    offset: number = 0,
    divisor: number = 1,
    target: GLenum = gl.ARRAY_BUFFER,
  ): void {
    gl.bindBuffer(target, buffer);
    gl.enableVertexAttribArray(index);
    gl.vertexAttribIPointer(index, size, type, stride, offset);
    gl.vertexAttribDivisor(index, divisor);
    gl.bindBuffer(target, null);
  }

  static async loadTexture(
    gl: WebGL2RenderingContext,
    url: string,
    signal?: AbortSignal,
  ): Promise<WebGLTexture> {
    signal?.throwIfAborted();
    const texture = gl.createTexture();
    if (texture === null) {
      throw new Error("Failed to create texture.");
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          img,
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
        resolve();
      };
      img.onerror = (...args) => {
        const error = args[4];
        reject(error ?? new Error(`Failed to load image: ${url}`));
      };
      img.src = url;
    });
    signal?.throwIfAborted();
    return texture;
  }

  static loadBuffer(
    gl: WebGL2RenderingContext,
    buffer: WebGLBuffer,
    data: Exclude<TypedArray, Float64Array>,
    offset: number = 0,
    target: GLenum = gl.ARRAY_BUFFER,
  ): void {
    gl.bindBuffer(target, buffer);
    gl.bufferSubData(target, offset * data.BYTES_PER_ELEMENT, data);
    gl.bindBuffer(target, null);
  }
}

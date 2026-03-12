import { type TypedArray } from "../types";

/** Low-level WebGL 2 helper methods for context, shader, buffer, texture, and blending management */
export class WebGLUtils {
  /**
   * Initializes a WebGL 2 rendering context on the given canvas
   *
   * @param canvas - The canvas element
   * @param contextAttributes - Optional WebGL context attributes
   * @throws If the browser does not support WebGL 2.0
   */
  static init(
    canvas: HTMLCanvasElement,
    contextAttributes?: WebGLContextAttributes,
  ): WebGL2RenderingContext {
    const gl = canvas.getContext("webgl2", contextAttributes);
    if (gl === null) {
      throw new Error("WebGL 2.0 is not supported by the browser.");
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    return gl;
  }

  /**
   * Compiles vertex and fragment shaders, links them into a program, and
   * returns the linked program
   *
   * The individual shaders are flagged for deletion after linking.
   *
   * @param gl - The WebGL 2 rendering context
   * @param vertexShaderSource - GLSL source for the vertex shader
   * @param fragmentShaderSource - GLSL source for the fragment shader
   * @throws If shader compilation or program linking fails
   */
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

  /**
   * Returns the location of a uniform variable in a shader program
   *
   * @param gl - The WebGL 2 rendering context
   * @param program - The shader program
   * @param name - The uniform name as declared in the shader
   * @throws If the uniform is not found
   */
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

  /**
   * Creates a new WebGL buffer
   *
   * @param gl - The WebGL 2 rendering context
   * @throws If buffer creation fails
   */
  static createBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
    const buffer = gl.createBuffer();
    if (buffer === null) {
      throw new Error("Failed to create buffer.");
    }
    return buffer;
  }

  /**
   * Allocates (or re-allocates) storage for a buffer, discarding previous contents
   *
   * @param gl - The WebGL 2 rendering context
   * @param target - Buffer binding target (e.g. `gl.ARRAY_BUFFER`)
   * @param buffer - The buffer to resize
   * @param size - New size in bytes
   * @param usage - Usage hint (e.g. `gl.STATIC_DRAW`)
   */
  static resizeBuffer(
    gl: WebGL2RenderingContext,
    target: GLenum,
    buffer: WebGLBuffer,
    size: GLsizeiptr,
    usage: GLenum,
  ): void {
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, size, usage);
    gl.bindBuffer(target, null);
  }

  /**
   * Creates a new vertex array object (VAO)
   *
   * @param gl - The WebGL 2 rendering context
   * @throws If VAO creation fails
   */
  static createVertexArray(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
    const vao = gl.createVertexArray();
    if (vao === null) {
      throw new Error("Failed to create vertex array object.");
    }
    return vao;
  }

  /**
   * Binds a buffer to a vertex attribute as a floating-point attribute
   *
   * @param gl - The WebGL 2 rendering context
   * @param target - Buffer binding target
   * @param buffer - The buffer containing attribute data
   * @param index - Attribute location index
   * @param size - Number of components per vertex attribute
   * @param type - Data type (e.g. `gl.FLOAT`)
   * @param options - Optional normalized, stride, offset, and divisor settings
   */
  static configureVertexFloatAttribute(
    gl: WebGL2RenderingContext,
    target: GLenum,
    buffer: WebGLBuffer,
    index: number,
    size: number,
    type: GLenum,
    options?: {
      normalized?: boolean;
      stride?: number;
      offset?: number;
      divisor?: number;
    },
  ): void {
    const {
      normalized = false,
      stride = 0,
      offset = 0,
      divisor = 0,
    } = options ?? {};
    gl.bindBuffer(target, buffer);
    gl.enableVertexAttribArray(index);
    gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
    gl.vertexAttribDivisor(index, divisor);
    gl.bindBuffer(target, null);
  }

  /**
   * Binds a buffer to a vertex attribute as an integer attribute
   *
   * @param gl - The WebGL 2 rendering context
   * @param target - Buffer binding target
   * @param buffer - The buffer containing attribute data
   * @param index - Attribute location index
   * @param size - Number of components per vertex attribute
   * @param type - Data type (e.g. `gl.UNSIGNED_INT`)
   * @param options - Optional stride, offset, and divisor settings
   */
  static configureVertexIntAttribute(
    gl: WebGL2RenderingContext,
    target: GLenum,
    buffer: WebGLBuffer,
    index: number,
    size: number,
    type: GLenum,
    options?: { stride?: number; offset?: number; divisor?: number },
  ): void {
    const { stride = 0, offset = 0, divisor = 0 } = options ?? {};
    gl.bindBuffer(target, buffer);
    gl.enableVertexAttribArray(index);
    gl.vertexAttribIPointer(index, size, type, stride, offset);
    gl.vertexAttribDivisor(index, divisor);
    gl.bindBuffer(target, null);
  }

  /**
   * Creates an immutable 2D data texture with nearest-neighbor filtering
   * and clamp-to-edge wrapping
   *
   * @param gl - The WebGL 2 rendering context
   * @param internalformat - Internal texture format (e.g. `gl.RGBA32F`)
   * @param width - Texture width in texels
   * @param height - Texture height in texels
   * @param format - Pixel data format (e.g. `gl.RGBA`)
   * @param type - Pixel data type (e.g. `gl.FLOAT`)
   * @param data - Optional initial pixel data
   */
  static createDataTexture(
    gl: WebGL2RenderingContext,
    internalformat: GLenum,
    width: number,
    height: number,
    format: GLenum,
    type: GLenum,
    data?: TypedArray,
  ): WebGLTexture {
    const texture = gl.createTexture();
    if (texture === null) {
      throw new Error("Failed to create texture.");
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, internalformat, width, height);
    if (data !== undefined) {
      // texStorage2D creates immutable storage, so we need to use texSubImage2D instead of texImage2D
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        width,
        height,
        format,
        type,
        data,
      );
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  }

  /**
   * Uploads new pixel data into an existing immutable 2D data texture
   *
   * @param gl - The WebGL 2 rendering context
   * @param texture - The target texture
   * @param width - Texture width in texels
   * @param height - Texture height in texels
   * @param format - Pixel data format (e.g. `gl.RGBA`)
   * @param type - Pixel data type (e.g. `gl.FLOAT`)
   * @param data - The pixel data to upload
   */
  static loadDataTexture(
    gl: WebGL2RenderingContext,
    texture: WebGLTexture,
    width: number,
    height: number,
    format: GLenum,
    type: GLenum,
    data: TypedArray,
  ): void {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, format, type, data);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /**
   * Loads an image from a URL and creates a WebGL texture from it
   *
   * @param gl - The WebGL 2 rendering context
   * @param url - The image URL
   * @param options - Optional mipmap generation flag and abort signal
   */
  static async loadImageTextureFromUrl(
    gl: WebGL2RenderingContext,
    url: string,
    options?: { mipmap?: boolean; signal?: AbortSignal },
  ): Promise<WebGLTexture> {
    const { mipmap = false, signal } = options ?? {};
    signal?.throwIfAborted();
    const texture = gl.createTexture();
    if (texture === null) {
      throw new Error("Failed to create texture.");
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      mipmap ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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
        if (mipmap) {
          gl.generateMipmap(gl.TEXTURE_2D);
        }
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

  /**
   * Uploads typed array data into a region of an existing buffer
   *
   * @param gl - The WebGL 2 rendering context
   * @param target - Buffer binding target
   * @param buffer - The target buffer
   * @param data - The data to upload
   * @param options - Optional element offset within the buffer
   */
  static loadBuffer(
    gl: WebGL2RenderingContext,
    target: GLenum,
    buffer: WebGLBuffer,
    data: Exclude<TypedArray, Float64Array>,
    options?: { offset?: number },
  ): void {
    const { offset = 0 } = options ?? {};
    gl.bindBuffer(target, buffer);
    gl.bufferSubData(target, offset * data.BYTES_PER_ELEMENT, data);
    gl.bindBuffer(target, null);
  }

  /**
   * Enables premultiplied-alpha blending (Porter-Duff "over" operator)
   *
   * @param gl - The WebGL 2 rendering context
   */
  static enableAlphaBlending(gl: WebGL2RenderingContext): void {
    // https://en.wikipedia.org/wiki/Alpha_compositing
    // https://learnopengl.com/Advanced-OpenGL/Blending
    // https://www.khronos.org/opengl/wiki/Blending
    // https://www.realtimerendering.com/blog/gpus-prefer-premultiplication/
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFuncSeparate(
      gl.ONE, // alpha is premultiplied in fragment shader
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA,
    );
  }

  /**
   * Disables blending and restores the default blend state
   *
   * @param gl - The WebGL 2 rendering context
   */
  static disableAlphaBlending(gl: WebGL2RenderingContext): void {
    gl.disable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFuncSeparate(gl.ONE, gl.ZERO, gl.ONE, gl.ZERO);
  }
}

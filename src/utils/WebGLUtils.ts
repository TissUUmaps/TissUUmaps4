export default class WebGLUtils {
  static createPointsOverlay(
    viewerCanvas: HTMLCanvasElement | HTMLElement,
  ): HTMLCanvasElement {
    // https://github.com/TissUUmaps/TissUUmaps/blob/0c1d1fba6746f7fbf2313711827438bed2381717/tissuumaps/static/js/utils/glUtils.js#L1991-L1997
    const pointsOverlay = document.createElement("canvas");
    pointsOverlay.width = 1; // TODO necessary?
    pointsOverlay.height = 1; // TODO necessary?
    pointsOverlay.style.position = "relative";
    pointsOverlay.style.width = "100%";
    pointsOverlay.style.height = "100%";
    pointsOverlay.style.zIndex = "12"; // TODO necessary?
    pointsOverlay.style.pointerEvents = "none"; // TODO necessary?

    // TODO https://github.com/TissUUmaps/TissUUmaps/blob/0c1d1fba6746f7fbf2313711827438bed2381717/tissuumaps/static/js/utils/glUtils.js#L2608-L2668
    //
    // canvas.addEventListener("webglcontextlost", (e) => e.preventDefault(), false);
    // canvas.addEventListener("webglcontextrestored", glUtils.restoreLostContext, false);
    //
    // const gl = canvas.getContext("webgl2", glUtils._options);
    // if (!(gl instanceof WebGL2RenderingContext)) {
    //   interfaceUtils.alert("Error: TissUUmaps requires a web browser that supports WebGL 2.0");
    // }
    //
    // // Get HW capabilities from WebGL context
    // glUtils._caps[gl.MAX_TEXTURE_SIZE] = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    // glUtils._caps[gl.ALIASED_POINT_SIZE_RANGE] = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
    // console.assert(glUtils._caps[gl.ALIASED_POINT_SIZE_RANGE] instanceof Float32Array);
    //
    // // Disable instanced marker drawing by default if the HW point size limit
    // // is large enough. Should be faster in most cases, and we can still
    // // temporarily switch to instanced drawing during viewport captures to
    // // avoid the HW point size limit.
    // if (glUtils._caps[gl.ALIASED_POINT_SIZE_RANGE][1] >= 1023) {
    //   glUtils._useInstancing = false;
    // }

    viewerCanvas.appendChild(pointsOverlay);

    // this._programs["markers"] = this._loadShaderProgram(gl, this._markersVS, this._markersFS);
    // this._programs["markers_instanced"] = this._loadShaderProgram(gl, this._markersVS, this._markersFS, "#define USE_INSTANCING\n");
    // this._programs["picking"] = this._loadShaderProgram(gl, this._pickingVS, this._pickingFS);
    // this._programs["edges"] = this._loadShaderProgram(gl, this._edgesVS, this._edgesFS);
    // this._programs["regions"] = this._loadShaderProgram(gl, this._regionsVS, this._regionsFS);
    // this._textures["shapeAtlas"] = this._loadTextureFromImageURL(gl, glUtils._markershapes);
    // this._buffers["quad"] = this._createQuad(gl);
    // this._buffers["transformUBO"] = this._createUniformBuffer(gl);
    // this._textures["regionLUT"] = this._createRegionLUTTexture(gl, glUtils._regionMaxNumRegions);
    // this._vaos["empty"] = gl.createVertexArray();

    // this._createColorbarCanvas();  // The colorbar is drawn separately in a 2D-canvas

    // glUtils.updateMarkerScale();
    // document.getElementById("ISS_globalmarkersize_text").addEventListener("input", glUtils.updateMarkerScale);
    // document.getElementById("ISS_globalmarkersize_text").addEventListener("input", glUtils.draw);

    // tmapp["hideSVGMarkers"] = true;
    // tmapp["ISS_viewer"].removeHandler('resize', glUtils.resizeAndDraw);
    // tmapp["ISS_viewer"].addHandler('resize', glUtils.resizeAndDraw);
    // tmapp["ISS_viewer"].removeHandler('open', glUtils.draw);
    // tmapp["ISS_viewer"].addHandler('open', glUtils.draw);
    // tmapp["ISS_viewer"].removeHandler('viewport-change', glUtils.draw);
    // tmapp["ISS_viewer"].addHandler('viewport-change', glUtils.draw);
    // tmapp["ISS_viewer"].removeHandler('canvas-click', glUtils.pick);
    // tmapp["ISS_viewer"].addHandler('canvas-click', glUtils.pick);

    // glUtils._initialized = true;
    // glUtils.resize();  // Force initial resize to OSD canvas size

    return pointsOverlay;
  }

  static destroyPointsOverlay(pointsOverlay: HTMLCanvasElement) {
    // TODO
    pointsOverlay.remove();
  }
}

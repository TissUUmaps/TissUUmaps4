export type WebGLOptions = {
  pointsRenderOptions: WebGLPointsRenderOptions;
  shapesRenderOptions: WebGLShapesRenderOptions;
};

export type WebGLPointsRenderOptions = {
  globalPointSizeFactor: number;
};

export type WebGLShapesRenderOptions = {
  strokeWidth: number;
  numScanlines: number;
};

#version 300 es

#define MAX_NUM_IMAGES 192

uniform mat2 u_viewportTransform;
uniform vec2 u_canvasSize;
uniform int u_transformIndex;
uniform float u_markerScale;
uniform float u_globalMarkerScale;
uniform float u_markerOpacity;
uniform float u_maxPointSize;
uniform float u_edgeThicknessRatio;
uniform sampler2D u_colorLUT;

layout(std140) uniform TransformUniforms {
    mat2x4 imageToViewport[MAX_NUM_IMAGES];
} u_transformUBO;

layout(location = 0) in vec4 in_position;
layout(location = 1) in int in_index;
layout(location = 4) in float in_opacity;
layout(location = 5) in float in_transform;

flat out vec4 v_color;
out vec2 v_texCoord;

void main() {
    int transformIndex0 = u_transformIndex >= 0 ? u_transformIndex : int(mod(in_transform, 256.0));
    int transformIndex1 = u_transformIndex >= 0 ? u_transformIndex : int(floor(in_transform / 256.0));
    mat3x2 imageToViewport0 = mat3x2(transpose(u_transformUBO.imageToViewport[transformIndex0]));
    mat3x2 imageToViewport1 = mat3x2(transpose(u_transformUBO.imageToViewport[transformIndex1]));

    vec2 localPos0 = in_position.xy;
    vec2 localPos1 = in_position.zw;

    // Transform 1st edge vertex
    vec2 viewportPos0 = imageToViewport0 * vec3(localPos0, 1.0);
    vec2 ndcPos0 = viewportPos0 * 2.0 - 1.0;
    ndcPos0.y = -ndcPos0.y;
    ndcPos0 = u_viewportTransform * ndcPos0;

    // Transform 2nd edge vertex
    vec2 viewportPos1 = imageToViewport1 * vec3(localPos1, 1.0);
    vec2 ndcPos1 = viewportPos1 * 2.0 - 1.0;
    ndcPos1.y = -ndcPos1.y;
    ndcPos1 = u_viewportTransform * ndcPos1;

    float pointSize = u_markerScale * u_globalMarkerScale;
    pointSize = clamp(pointSize, 0.05, u_maxPointSize);
    float lineThickness = max(0.5, u_edgeThicknessRatio * pointSize);
    float lineThicknessAdjusted = lineThickness + 0.25;  // Expanded thickness values,
    float lineThicknessAdjusted2 = lineThickness + 0.5;  // needed for anti-aliasing
    float lineThicknessOpacity = clamp(u_edgeThicknessRatio * pointSize, 0.005, 1.0);

    vec2 ndcMidpoint = (ndcPos1 + ndcPos0) * 0.5;
    vec2 ndcDeltaU = (ndcPos1 - ndcPos0) * 0.5;
    vec2 canvasDeltaU = ndcDeltaU * u_canvasSize;
    vec2 canvasDeltaV = vec2(-canvasDeltaU.y, canvasDeltaU.x);
    vec2 ndcDeltaV = lineThicknessAdjusted * normalize(canvasDeltaV) / u_canvasSize;

    gl_Position = vec4(ndcMidpoint, 0.0, 1.0);

    // Edge will be drawn as a triangle strip, so need to generate
    // texture coordinate and offset the output position depending on
    // which of the four corners we are processing
    v_texCoord = vec2(gl_VertexID & 1, (gl_VertexID >> 1) & 1);
    v_texCoord.y = ((v_texCoord.y - 0.5) * (lineThicknessAdjusted2 / lineThickness)) + 0.5;
    gl_Position.xy += (v_texCoord.x * 2.0 - 1.0) * ndcDeltaU;
    gl_Position.xy += (v_texCoord.y * 2.0 - 1.0) * ndcDeltaV;

    v_color.rgb = vec3(0.8);  // Use a fixed color (for now)
    v_color.a = in_opacity * u_markerOpacity * lineThicknessOpacity;
}
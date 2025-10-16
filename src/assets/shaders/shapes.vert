#version 300 es

uniform mat3x2 u_viewportToWorldMatrix;
uniform mat3x2 u_worldToDataMatrix;
uniform uint u_numScanlines;
uniform vec4 u_objectBounds; // (xmin, ymin, xmax, ymax), in data dimensions
uniform float u_strokeWidth; // in world dimensions

layout(location = 0) in vec2 a_viewportPos; // viewport corner, in [0, 1]

out vec2 v_pos; // in data dimensions
out float v_scanline; // in [0, u_numScanlines]
flat out float v_hsw; // half stroke width, in data dimensions

void main() {
    vec2 worldPos = u_viewportToWorldMatrix * vec3(a_viewportPos, 1.0);
    v_pos = u_worldToDataMatrix * vec3(worldPos, 1.0);
    v_scanline = float(u_numScanlines) * (v_pos.y - u_objectBounds[1]) / (u_objectBounds[3] - u_objectBounds[1]);
    v_hsw = 0.5 * u_strokeWidth * length(u_worldToDataMatrix[0]);
    gl_Position = vec4((2.0 * a_viewportPos - 1.0) * vec2(1.0, -1.0), 0.0, 1.0);
}

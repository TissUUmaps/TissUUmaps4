#version 300 es

#define DISCARD gl_Position = vec4(2.0, 2.0, 0.0, 1.0); v_pos = vec2(0); v_scanline = 0.0; v_hsw = 0.0; return;

uniform mat3x2 u_viewportToWorldMatrix;
uniform mat3x2 u_worldToDataMatrix;
uniform float u_strokeWidth; // in world dimensions
uniform uint u_numScanlines;
uniform vec4 u_objectBounds; // (x, y, width, height), in data dimensions

out vec2 v_pos; // in data dimensions
out float v_scanline; // in [0, u_numScanlines]
flat out float v_hsw; // half stroke width, in data dimensions

void main() {
    if(u_numScanlines == 0u || u_objectBounds[2] <= 0.0 || u_objectBounds[3] <= 0.0) {
        DISCARD; // no scanlines or invalid object bounds
    }
    vec2 viewportPos = vec2(gl_VertexID % 2, gl_VertexID / 2);
    vec2 worldPos = u_viewportToWorldMatrix * vec3(viewportPos, 1.0);
    v_pos = u_worldToDataMatrix * vec3(worldPos, 1.0);
    v_scanline = float(u_numScanlines) * (v_pos.y - u_objectBounds[1]) / u_objectBounds[3];
    v_hsw = 0.5 * u_strokeWidth * length(u_worldToDataMatrix[0]); // uniform scaling factor
    gl_Position = vec4((2.0 * viewportPos - 1.0) * vec2(1.0, -1.0), 0.0, 1.0);
}

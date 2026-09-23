#version 300 es

uniform vec4 u_quad; // (x, y, width, height) of the quad to draw, in viewport coordinates [0, 1]
uniform mat3x2 u_viewportToWorldMatrix;
uniform mat3x2 u_worldToDataMatrix;
uniform uint u_numScanlines;
uniform vec4 u_objectBounds; // (x, y, width, height), in data dimensions

out vec2 v_pos; // in data dimensions
out float v_scanline; // in [0, u_numScanlines]

void main() {
    vec2 viewportPos = u_quad.xy + u_quad.zw * vec2(gl_VertexID % 2, gl_VertexID / 2);
    vec2 worldPos = u_viewportToWorldMatrix * vec3(viewportPos, 1.0);
    v_pos = u_worldToDataMatrix * vec3(worldPos, 1.0);
    v_scanline = float(u_numScanlines) * (v_pos.y - u_objectBounds[1]) / u_objectBounds[3];
    gl_Position = vec4((2.0 * viewportPos - 1.0) * vec2(1.0, -1.0), 0.0, 1.0);
}

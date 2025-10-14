#version 300 es

layout(location = 0) in vec2 a_viewportPos; // viewport corner, in viewport coordinates

uniform mat3x2 u_viewportToWorldMatrix;
uniform uint u_numScanlines;

out vec2 v_viewportPos; // in [0, 1]
out vec2 v_worldPos; // in world coordinates
out float v_scanline; // in [0, u_numScanlines]

void main() {
    v_viewportPos = a_viewportPos;
    v_worldPos = u_viewportToWorldMatrix * vec3(v_viewportPos, 1.0f);
    v_scanline = v_viewportPos.y * float(u_numScanlines);
    gl_Position = vec4((2.0f * v_viewportPos - 1.0f) * vec2(1.0f, -1.0f), 0.0f, 1.0f);
}

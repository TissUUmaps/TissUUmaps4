#version 300 es

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#implicit_defaults
precision highp float; // no default otherwise
precision highp int; // defaults to mediump otherwise
precision highp sampler2D;  // defaults to lowp otherwise

in vec2 v_viewportPos; // in [0, 1]
in vec2 v_worldPos; // in world coordinates
in float v_scanline; // in [0, u_numScanlines]

uniform sampler2D u_shapes;

out vec4 fragColor;

void main() {
    uint scanline = uint(v_scanline);
}
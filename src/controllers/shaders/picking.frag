#version 300 es

precision highp float;
precision highp int;

flat in vec4 v_color;

layout(location = 0) out vec4 out_color;

void main() {
    out_color = v_color;
}
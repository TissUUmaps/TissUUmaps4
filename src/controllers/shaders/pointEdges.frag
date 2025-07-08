#version 300 es

precision highp float;
precision highp int;

flat in vec4 v_color;
in vec2 v_texCoord;

layout(location = 0) out vec4 out_color;

float subpixelCoverage(vec2 uv) {
    vec2 samples[4];  // Sample locations (from rotated grid)
    samples[0] = vec2(0.25, -0.75);
    samples[1] = vec2(0.75, 0.25);
    samples[2] = vec2(-0.25, 0.75);
    samples[3] = vec2(-0.75, -0.25);

    vec2 deltaX = dFdx(uv) * 0.5;
    vec2 deltaY = dFdy(uv) * 0.5;
    float accum = 0.0;
    for(int i = 0; i < 4; ++i) {
        // Check if sample is inside or outside the line for the edge
        vec2 uv_i = uv + samples[i].x * deltaX + samples[i].y * deltaY;
        bool inside = (uv_i.x > 0.0 && uv_i.x < 1.0 && uv_i.y > 0.0 && uv_i.y < 1.0);
        accum += float(inside);
    }
    return accum * (1.0 / 4.0);
}

void main() {
    out_color.rgb = v_color.rgb;
    out_color.a = v_color.a * subpixelCoverage(v_texCoord);
}
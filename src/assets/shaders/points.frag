#version 300 es

#define MARKER_ATLAS_GRID_SIZE 4u
#define DISTANCE_MULTIPLIER 8.f
#define TEXTURE_LOD_BIAS -2.f
#define ALPHA_THRESHOLD 0.005f

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#implicit_defaults
precision highp float; // no default otherwise
precision highp int; // defaults to mediump otherwise

// Signed distance fields (SDFs),
// pre-multiplied by DISTANCE_MULTIPLIER,
// and quantized into unsigned 8-bit integers
uniform highp sampler2D u_markerAtlas;

flat in vec4 v_color;
flat in uvec3 v_marker;

out vec4 fragColor;

void main() {
    if(v_color.a == 0.f) {
        discard;
    }
    vec2 uv = (float(v_marker.xy) + gl_PointCoord.xy) / float(MARKER_ATLAS_GRID_SIZE);
    float dist = (texture(u_markerAtlas, uv, TEXTURE_LOD_BIAS)[v_marker.z] - 0.5f) * 255.f / DISTANCE_MULTIPLIER;
    float pixelWidth = dFdx(uv.x) * float(textureSize(u_markerAtlas, 0).x);
    float alpha = v_color.a * clamp(dist / pixelWidth + 0.5f, 0.f, 1.f);
    if(alpha < ALPHA_THRESHOLD) {
        discard;
    }
    fragColor = vec4(v_color.rgb * alpha, alpha);
}

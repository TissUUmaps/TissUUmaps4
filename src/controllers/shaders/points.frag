#version 300 es

#define SHAPE_SDF_ATLAS_GRID_SIZE 4
#define DISTANCE_MULTIPLIER 8.0f
#define TEXTURE_LOD_BIAS -2.0f
#define ALPHA_THRESHOLD 0.005f

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#implicit_defaults
precision highp float; // there isn't a default otherwise
precision highp int; // defaults to mediump otherwise
precision highp sampler2D;  // defaults to lowp otherwise

// Signed distance fields (SDFs), pre-multiplied by DISTANCE_MULTIPLIER,
// quantized into unsigned 8-bit integers, and stored in the red channel
uniform sampler2D u_shapeSDFAtlas;

flat in vec2 v_shapeOrigin;
flat in vec4 v_shapeColor;

out vec4 fragColor;

void main() {
    vec2 uv = (v_shapeOrigin.xy + gl_PointCoord.xy) / float(SHAPE_SDF_ATLAS_GRID_SIZE);
    float dist = (texture(u_shapeSDFAtlas, uv, TEXTURE_LOD_BIAS).r - 0.5f) * 255.0f / DISTANCE_MULTIPLIER;
    float pixelWidth = dFdx(uv.x) * float(textureSize(u_shapeSDFAtlas, 0).x);
    float alpha = clamp(dist / pixelWidth + 0.5f, 0.0f, 1.0f);
    fragColor = vec4(v_shapeColor.rgb, v_shapeColor.a * alpha);
    if(fragColor.a < ALPHA_THRESHOLD) {
        discard;
    }
}

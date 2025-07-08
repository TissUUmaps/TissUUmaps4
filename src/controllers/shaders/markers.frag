#version 300 es

#define USE_INSTANCING // TODO

#define UV_SCALE 0.8
#define SHAPE_INDEX_GAUSSIAN 15.0
#define SHAPE_GRID_SIZE 4.0

precision highp float;
precision highp int;

uniform float u_markerStrokeWidth;
uniform bool u_markerFilled;
uniform bool u_markerOutline;
uniform bool u_usePiechartFromMarker;
uniform bool u_alphaPass;
uniform highp sampler2D u_shapeAtlas;

flat in vec4 v_color;
flat in vec2 v_shapeOrigin;
flat in vec2 v_shapeSector;
flat in float v_shapeIndex;
flat in float v_shapeSize;
#ifdef USE_INSTANCING
in vec2 v_texCoord;
#else
#define v_texCoord gl_PointCoord
#endif  // USE_INSTANCING

layout(location = 0) out vec4 out_color;

float sectorToAlpha(vec2 sector, vec2 uv) {
    vec2 dir = normalize(uv - 0.5);
    float theta = (atan(dir.x, dir.y) / 3.141592) * 0.5 + 0.5;
    return float(theta > sector[0] && theta < sector[1]);
}

float sectorToAlphaAA(vec2 sector, vec2 uv, float delta) {
    // This workaround avoids the problem with small pixel-wide
    // gaps that can appear between the first and last sector
    if(uv.y < 0.5 && abs(uv.x - 0.5) < delta)
        return 1.0;

    float accum = 0.0;
    accum += sectorToAlpha(sector, uv + vec2(-delta, -delta));
    accum += sectorToAlpha(sector, uv + vec2(delta, -delta));
    accum += sectorToAlpha(sector, uv + vec2(-delta, delta));
    accum += sectorToAlpha(sector, uv + vec2(delta, delta));
    return accum / 4.0;
}

void main() {
    vec2 uv = (v_texCoord - 0.5) * UV_SCALE + 0.5;
    uv = (uv + v_shapeOrigin) * (1.0 / SHAPE_GRID_SIZE);

    vec4 shapeColor = vec4(0.0);

    // Sample shape texture and reconstruct marker shape from signed
    // distance field (SDF) encoded in the red channel. Distance values
    // are assumed to be pre-multiplied by a scale factor 8.0 before
    // being quantized into 8-bit. Other channels in the texture are
    // currently ignored, but could be used for storing additional shapes
    // in the future!

    float pixelWidth = dFdx(uv.x) * float(textureSize(u_shapeAtlas, 0).x) * 8.0;
    float markerStrokeWidth = min(14.0, u_markerStrokeWidth) * 8.0;  // Keep within SDF range
    float distBias = u_markerFilled ? -pixelWidth * 0.25 : 0.0;  // Minification distance bias

    float distShape = (texture(u_shapeAtlas, uv, -2.0).r - 0.5) * 255.0;
    float distOutline = markerStrokeWidth - abs(distShape) + distBias;  // Add bias to fix darkening
    float alpha = clamp(distShape / pixelWidth + 0.5, 0.0, 1.0) * float(u_markerFilled);
    float alpha2 = clamp(distOutline / pixelWidth + 0.5, 0.0, 1.0) * float(u_markerOutline);
    if(distOutline < (markerStrokeWidth + 4.0) - 127.5) {
        alpha2 = 0.0;  // Fixes problem with alpha bleeding on minification
    }
    shapeColor = vec4(vec3(mix(1.0, 0.7, alpha2)), max(alpha, alpha2));
    if(!u_markerFilled && u_markerOutline) {
        shapeColor.rgb = vec3(1.0);  // Use brighter outline to show actual marker color 
    }

    // Handle special types of shapes (Gaussians and piecharts)

    if(v_shapeIndex == SHAPE_INDEX_GAUSSIAN) {
        shapeColor = vec4(vec3(1.0), smoothstep(0.5, 0.0, length(v_texCoord - 0.5)));
    }
    if(u_usePiechartFromMarker && !u_alphaPass) {
        float delta = 0.25 / v_shapeSize;
        shapeColor.a *= sectorToAlphaAA(v_shapeSector, v_texCoord, delta);
    }

    out_color = shapeColor * v_color;
    if(out_color.a < 0.004)
        discard;
}
#version 300 es

#define UV_SCALE 0.8
#define SCALE_FIX (UV_SCALE / 0.7)  // For compatibility with old UV_SCALE
#define SHAPE_INDEX_CIRCLE_NOSTROKE 16.0
#define SHAPE_GRID_SIZE 4.0
#define MAX_NUM_IMAGES 192
#define MAX_NUM_BARCODES 32768
#define DISCARD_VERTEX { gl_Position = vec4(2.0, 2.0, 2.0, 0.0); return; }

#define OP_CLEAR 0
#define OP_WRITE_INDEX 1

uniform mat2 u_viewportTransform;
uniform vec2 u_canvasSize;
uniform vec2 u_pickingLocation;
uniform int u_transformIndex;
uniform float u_markerScale;
uniform float u_globalMarkerScale;
uniform float u_markerOpacity;
uniform float u_maxPointSize;
uniform bool u_usePiechartFromMarker;
uniform bool u_useShapeFromMarker;
uniform bool u_useAbsoluteMarkerSize;
uniform int u_op;
uniform sampler2D u_colorLUT;
uniform sampler2D u_shapeAtlas;

layout(std140) uniform TransformUniforms {
    mat2x4 imageToViewport[MAX_NUM_IMAGES];
} u_transformUBO;

layout(location = 0) in vec4 in_position;
layout(location = 1) in int in_index;
layout(location = 2) in float in_scale;
layout(location = 4) in float in_opacity;
layout(location = 5) in float in_transform;

flat out vec4 v_color;

vec3 hex_to_rgb(float v) {
    // Extract RGB color from 24-bit hex color stored in float
    v = clamp(v, 0.0, 16777215.0);
    return floor(mod((v + 0.49) / vec3(65536.0, 256.0, 1.0), 256.0)) / 255.0;
}

void main() {
    int transformIndex = u_transformIndex >= 0 ? u_transformIndex : int(in_transform);
    mat3x2 imageToViewport = mat3x2(transpose(u_transformUBO.imageToViewport[transformIndex]));
    vec2 viewportPos = imageToViewport * vec3(in_position.xy, 1.0);
    vec2 ndcPos = u_viewportTransform * ((viewportPos * 2.0 - 1.0) * vec2(1.0, -1.0));

    v_color = vec4(0.0);
    if(u_op == OP_WRITE_INDEX) {
        int lutIndex = int(mod(in_position.z, float(MAX_NUM_BARCODES)));
        float shapeID = texelFetch(u_colorLUT, ivec2(lutIndex & 4095, lutIndex >> 12), 0).a;
        if(shapeID == 0.0)
            DISCARD_VERTEX;

        if(u_useShapeFromMarker) {
            // Add one to marker index and normalize, to make things consistent
            // with how marker visibility and shape is stored in the LUT
            shapeID = (floor(in_position.z / float(MAX_NUM_BARCODES)) + 1.0) / 255.0;
        }

        if(u_usePiechartFromMarker) {
            shapeID = SHAPE_INDEX_CIRCLE_NOSTROKE / 255.0;

            // For the picking pass, we only want to draw the marker once
            float sectorIndex = floor(in_position.z / float(MAX_NUM_BARCODES));
            if(sectorIndex > 0.0)
                DISCARD_VERTEX;
        }

        vec2 canvasPos = (ndcPos * 0.5 + 0.5) * u_canvasSize;
        canvasPos.y = (u_canvasSize.y - canvasPos.y);  // Y-axis is inverted

        float pointSize = 0.0;
        if(u_useAbsoluteMarkerSize) {
            vec2 viewportPos2 = imageToViewport * vec3(in_position.xy + vec2(1.0, 0.0), 1.0);
            vec2 ndcPos2 = u_viewportTransform * ((viewportPos2 * 2.0 - 1.0) * vec2(1.0, -1.0));
            // When computing this scale factor, we want square markers with
            // unit size to match approx. one pixel in the image layer
            float imagePixelFactor = length((ndcPos2 - ndcPos) * u_canvasSize) * 0.68;
            pointSize = (in_scale * u_markerScale * imagePixelFactor) * SCALE_FIX;
        } else {
            // Use default relative marker size
            pointSize = (in_scale * u_markerScale * u_globalMarkerScale) * SCALE_FIX;
        }
        pointSize = clamp(pointSize, 1.0, u_maxPointSize);

        // Do coarse inside/outside test against bounding box for marker
        vec2 uv = (canvasPos - u_pickingLocation) / pointSize + 0.5;
        uv.y = (1.0 - uv.y);  // Flip y-axis to match gl_PointCoord behaviour
        if(abs(uv.x - 0.5) > 0.5 || abs(uv.y - 0.5) > 0.5)
            DISCARD_VERTEX;

        // Do fine-grained inside/outside test by sampling the shape texture
        // with signed distance field (SDF) encoded in the red channel.
        // Currently, this does not take settings for fill and outline into
        // account, so all markers are assumed to be filled (TODO).
        vec2 shapeOrigin = vec2(0.0);
        shapeOrigin.x = mod((shapeID + 0.00001) * 255.0 - 1.0, SHAPE_GRID_SIZE);
        shapeOrigin.y = floor(((shapeID + 0.00001) * 255.0 - 1.0) / SHAPE_GRID_SIZE);
        uv = (uv - 0.5) * UV_SCALE + 0.5;
        uv = (uv + shapeOrigin) * (1.0 / SHAPE_GRID_SIZE);
        if(texture(u_shapeAtlas, uv).r < 0.5)
            DISCARD_VERTEX;

        // Also do a quick alpha-test to avoid picking non-visible markers
        if(in_opacity * u_markerOpacity <= 0.0)
            DISCARD_VERTEX

        // Output marker index encoded as hexadecimal color
        int encoded = in_index + 1;
        v_color.r = float((encoded >> 0) & 255) / 255.0;
        v_color.g = float((encoded >> 8) & 255) / 255.0;
        v_color.b = float((encoded >> 16) & 255) / 255.0;
        v_color.a = float((encoded >> 24) & 255) / 255.0;
    }

    gl_Position = vec4(-0.9999, -0.9999, 0.0, 1.0);
    gl_PointSize = 1.0;
}
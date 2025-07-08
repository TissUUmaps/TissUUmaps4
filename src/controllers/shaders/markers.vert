#version 300 es

#define USE_INSTANCING // TODO

#define SHAPE_INDEX_CIRCLE 7.0
#define SHAPE_INDEX_CIRCLE_NOSTROKE 16.0
#define SHAPE_INDEX_GAUSSIAN 15.0
#define SHAPE_GRID_SIZE 4.0
#define MAX_NUM_IMAGES 192
#define MAX_NUM_BARCODES 32768
#define UV_SCALE 0.8
#define SCALE_FIX (UV_SCALE / 0.7)  // For compatibility with old UV_SCALE
#define DISCARD_VERTEX { gl_Position = vec4(2.0, 2.0, 2.0, 0.0); return; }

uniform mat2 u_viewportTransform;
uniform vec2 u_canvasSize;
uniform int u_transformIndex;
uniform float u_markerScale;
uniform float u_globalMarkerScale;
uniform vec2 u_markerScalarRange;
uniform float u_markerOpacity;
uniform float u_maxPointSize;
uniform bool u_useColorFromMarker;
uniform bool u_useColorFromColormap;
uniform bool u_usePiechartFromMarker;
uniform bool u_useShapeFromMarker;
uniform bool u_useAbsoluteMarkerSize;
uniform bool u_alphaPass;
uniform int u_pickedMarker;
uniform sampler2D u_colorLUT;
uniform sampler2D u_colorscale;

layout(std140) uniform TransformUniforms {
    mat2x4 imageToViewport[MAX_NUM_IMAGES];
} u_transformUBO;

layout(location = 0) in vec4 in_position;
layout(location = 1) in int in_index;
layout(location = 2) in float in_scale;
layout(location = 3) in float in_shape;
layout(location = 4) in float in_opacity;
layout(location = 5) in float in_transform;

flat out vec4 v_color;
flat out vec2 v_shapeOrigin;
flat out vec2 v_shapeSector;
flat out float v_shapeIndex;
flat out float v_shapeSize;
#ifdef USE_INSTANCING
out vec2 v_texCoord;
#endif  // USE_INSTANCING

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

    int lutIndex = int(mod(in_position.z, float(MAX_NUM_BARCODES)));
    v_color = texelFetch(u_colorLUT, ivec2(lutIndex & 4095, lutIndex >> 12), 0);

    if(u_useColorFromMarker || u_useColorFromColormap) {
        vec2 range = u_markerScalarRange;
        float normalized = (in_position.w - range[0]) / (range[1] - range[0]);
        v_color.rgb = texture(u_colorscale, vec2(normalized, 0.5)).rgb;
        if(u_useColorFromMarker)
            v_color.rgb = hex_to_rgb(in_position.w);
    }

    if(u_useShapeFromMarker && v_color.a > 0.0) {
        // Add one to marker index and normalize, to make things consistent
        // with how marker visibility and shape is stored in the LUT
        v_color.a = (floor(in_position.z / float(MAX_NUM_BARCODES)) + 1.0) / 255.0;
    }

    if(u_usePiechartFromMarker && v_color.a > 0.0) {
        v_shapeSector[0] = mod(in_shape, 4096.0) / 4095.0;
        v_shapeSector[1] = floor(in_shape / 4096.0) / 4095.0;
        v_color.rgb = hex_to_rgb(in_position.w);
        v_color.a = SHAPE_INDEX_CIRCLE_NOSTROKE / 255.0;
        if(u_pickedMarker == in_index)
            v_color.a = SHAPE_INDEX_CIRCLE / 255.0;

        // For the alpha pass, we only want to draw the marker once
        float sectorIndex = floor(in_position.z / float(MAX_NUM_BARCODES));
        if(u_alphaPass)
            v_color.a *= float(sectorIndex == 0.0);
    }

    gl_Position = vec4(ndcPos, 0.0, 1.0);

    if(u_useAbsoluteMarkerSize) {
        vec2 viewportPos2 = imageToViewport * vec3(in_position.xy + vec2(1.0, 0.0), 1.0);
        vec2 ndcPos2 = u_viewportTransform * ((viewportPos2 * 2.0 - 1.0) * vec2(1.0, -1.0));
        // When computing this scale factor, we want square markers with
        // unit size to match approx. one pixel in the image layer
        float imagePixelFactor = length((ndcPos2 - ndcPos) * u_canvasSize) * 0.68;
        gl_PointSize = (in_scale * u_markerScale * imagePixelFactor) * SCALE_FIX;
    } else {
        // Use default relative marker size
        gl_PointSize = (in_scale * u_markerScale * u_globalMarkerScale) * SCALE_FIX;
    }
    float alphaFactorSize = clamp(gl_PointSize, 0.2, 1.0);
    gl_PointSize = clamp(gl_PointSize, 1.0, u_maxPointSize);

    v_shapeIndex = floor((v_color.a + 1e-5) * 255.0);
    v_shapeOrigin.x = mod(v_shapeIndex - 1.0, SHAPE_GRID_SIZE);
    v_shapeOrigin.y = floor((v_shapeIndex - 1.0) / SHAPE_GRID_SIZE);
    v_shapeSize = gl_PointSize;

#ifdef USE_INSTANCING
    // Marker will be drawn as a triangle strip, so need to generate
    // texture coordinate and offset the output position depending on
    // which of the four corners we are processing
    v_texCoord = vec2(gl_VertexID & 1, (gl_VertexID >> 1) & 1);
    gl_Position.xy += (v_texCoord * 2.0 - 1.0) * (gl_PointSize / u_canvasSize);
    v_texCoord.y = 1.0 - v_texCoord.y;  // Flip Y-axis to match gl_PointCoord behaviour
#endif  // USE_INSTANCING

    // Discard point here in vertex shader if marker is hidden
    v_color.a = v_color.a > 0.0 ? in_opacity * u_markerOpacity : 0.0;
    v_color.a *= alphaFactorSize * alphaFactorSize;
    v_color.a = clamp(v_color.a, 0.0, 1.0);
    if(v_color.a == 0.0)
        DISCARD_VERTEX;
}
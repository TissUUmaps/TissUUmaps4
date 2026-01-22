#version 300 es

// maximum number of objects
#define MAX_N_OBJECTS 256u

// marker atlas configuration
#define MARKER_ATLAS_GRID_SIZE 4u
#define N_MARKER_ATLAS_CHANNELS 4u
#define N_MARKERS_PER_CHANNEL (MARKER_ATLAS_GRID_SIZE * MARKER_ATLAS_GRID_SIZE)
#define MAX_N_MARKERS (N_MARKER_ATLAS_CHANNELS * N_MARKERS_PER_CHANNEL)

// macro to discard the current vertex
#define DISCARD gl_PointSize = 0.0; gl_Position = vec4(2.0, 2.0, 0.0, 1.0); v_color = vec4(0.0); v_marker = uvec3(0); return;

// uniforms
uniform float u_globalPointSizeFactor;
uniform mat3x2 u_worldToViewportMatrix;
uniform vec2 u_viewportSize; // in world units
uniform vec2 u_canvasSize; // in browser pixels
uniform float u_devicePixelRatio; // device pixels per browser pixel

// uniform buffer object (UBO) for per-object data
// an object represents a unique combination of layer and point cloud
// layers and point clouds were fused to reduce the number of index buffers
layout(std140) uniform ObjectsUBO {
    // https://learnopengl.com/Advanced-OpenGL/Advanced-GLSL
    // Matrices are stored as a large array of column vectors,
    // where each of those vectors has a base alignment of vec4.
    // Vectors have a base alignment of 2N (vec2) or 4N (vec3, vec4),
    // where N is the size of the base type (4 bytes for float).
    // Thus, mat2x4 has a base alignment of 4N, and each column
    // is aligned to 4N. Since mat2x4 has 2 columns, its
    // base alignment is 2 * 4N = 8N = 32 bytes.
    mat2x4 transposedDataToWorldMatrices[MAX_N_OBJECTS];
    vec4 objectPointSizeFactors[MAX_N_OBJECTS / 4u];
};

// vertex attributes
layout(location = 0) in float a_x; // in data units
layout(location = 1) in float a_y; // in data units
layout(location = 2) in float a_size; // in data units
layout(location = 3) in uint a_color; // packed 8-bit RGBA
layout(location = 4) in uint a_marker; // marker index
layout(location = 5) in uint a_object; // object index

// outputs to fragment shader
flat out vec4 v_color; // RGBA color
flat out uvec3 v_marker; // (col, row, channel)

// unpacks a uint-packed 8-bit RGBA color
vec4 unpackColor(uint color) {
    float r = float((color >> 24) & 0xFFu) / 255.0;
    float g = float((color >> 16) & 0xFFu) / 255.0;
    float b = float((color >> 8) & 0xFFu) / 255.0;
    float a = float((color >> 0) & 0xFFu) / 255.0;
    return vec4(r, g, b, a);
}

// returns (col, row, channel) for a given marker index in the marker atlas
uvec3 markerAtlasCoords(uint marker) {
    uint col = (marker % N_MARKERS_PER_CHANNEL) % MARKER_ATLAS_GRID_SIZE;
    uint row = (marker % N_MARKERS_PER_CHANNEL) / MARKER_ATLAS_GRID_SIZE;
    uint channel = marker / N_MARKERS_PER_CHANNEL;
    return uvec3(col, row, channel);
}

// main vertex shader function
void main() {
    // discard points with invalid marker or object indices
    if(a_marker >= MAX_N_MARKERS || a_object >= MAX_N_OBJECTS) {
        DISCARD;
    }

    // compute object-specific parameters
    float objectPointSizeFactor = objectPointSizeFactors[a_object / 4u][a_object % 4u];
    mat3x2 dataToWorldMatrix = mat3x2(transpose(transposedDataToWorldMatrices[a_object]));
    float dataToWorldScale = (length(dataToWorldMatrix[0]) + length(dataToWorldMatrix[1])) / 2.0;
    float canvasPixelRatio = dot(u_canvasSize / u_viewportSize, vec2(0.5));

    // compute point size in device pixels and discard points with non-positive size
    float worldPointSize = a_size * objectPointSizeFactor * u_globalPointSizeFactor * dataToWorldScale;
    float canvasPointSize = worldPointSize * canvasPixelRatio; // in browser pixels
    float devicePointSize = canvasPointSize * u_devicePixelRatio; // in device pixels
    if(devicePointSize <= 0.0) {
        DISCARD;
    }

    // compute point position in normalized device coordinates (NDCs) and discard points outside the viewport
    vec2 worldPosition = dataToWorldMatrix * vec3(a_x, a_y, 1.0);
    vec2 viewportPosition = u_worldToViewportMatrix * vec3(worldPosition, 1.0); // in [0, 1]
    vec2 ndcPosition = (2.0 * viewportPosition - 1.0) * vec2(1.0, -1.0); // in [-1, 1], y flipped
    vec2 ndcPointSize = 2.0 * worldPointSize / u_viewportSize;
    if(ndcPosition.x + 0.5 * ndcPointSize.x < -1.0 || ndcPosition.x - 0.5 * ndcPointSize.x > 1.0 || ndcPosition.y + 0.5 * ndcPointSize.y < -1.0 || ndcPosition.y - 0.5 * ndcPointSize.y > 1.0) {
        DISCARD;
    }

    // unpack color and discard fully transparent points
    vec4 color = unpackColor(a_color);
    if(color.a == 0.0) {
        DISCARD;
    }

    // get marker atlas coordinates
    uvec3 marker = markerAtlasCoords(a_marker);

    // set outputs
    gl_PointSize = devicePointSize;
    gl_Position = vec4(ndcPosition, 0.0, 1.0);
    v_color = color;
    v_marker = marker;
}

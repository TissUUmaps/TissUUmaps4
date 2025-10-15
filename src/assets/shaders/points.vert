#version 300 es

#define MAX_N_OBJECTS 256u // WebGLPointsController.MAX_N_OBJECTS

#define MAX_N_MARKERS 64u // 4 * N_MARKERS_PER_CHANNEL
#define N_MARKERS_PER_CHANNEL 16u // MARKER_ATLAS_GRID_SIZE * MARKER_ATLAS_GRID_SIZE
#define MARKER_ATLAS_GRID_SIZE 4u

#define DISCARD gl_PointSize = 0.f; gl_Position = vec4(2.f, 2.f, 0.f, 1.f); v_marker = uvec3(0); v_color = vec4(0.f); return;

uniform mat3x2 u_worldToViewportMatrix;
uniform float u_pointSizeFactor;

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
};

layout(location = 0) in float a_x;
layout(location = 1) in float a_y;
layout(location = 2) in float a_size;
layout(location = 3) in uint a_color;
layout(location = 4) in uint a_markerIndex;
layout(location = 5) in uint a_objectIndex;

flat out vec4 v_color;
flat out uvec3 v_marker;

// unpacks a uint-packed 8-bit RGBA color
vec4 unpackColor(uint color) {
    float r = float((color >> 24) & 0xFFu) / 255.f;
    float g = float((color >> 16) & 0xFFu) / 255.f;
    float b = float((color >> 8) & 0xFFu) / 255.f;
    float a = float(color & 0xFFu) / 255.f;
    return vec4(r, g, b, a);
}

// returns (col, row, channel) for a given marker index in the marker atlas
uvec3 markerAtlasCoords(uint markerIndex) {
    uint col = (markerIndex % N_MARKERS_PER_CHANNEL) % MARKER_ATLAS_GRID_SIZE;
    uint row = (markerIndex % N_MARKERS_PER_CHANNEL) / MARKER_ATLAS_GRID_SIZE;
    uint channel = markerIndex / N_MARKERS_PER_CHANNEL;
    return uvec3(col, row, channel);
}

void main() {
    if(a_markerIndex >= MAX_N_MARKERS || a_objectIndex >= MAX_N_OBJECTS) {
        DISCARD;
    }
    mat4x2 dataToWorldMatrix = transpose(transposedDataToWorldMatrices[a_objectIndex]);
    vec2 worldPosition = dataToWorldMatrix * vec4(a_x, a_y, 1.f, 0.f);
    vec2 viewportPosition = u_worldToViewportMatrix * vec3(worldPosition, 1.f); // in [0, 1]
    gl_Position = vec4((2.f * viewportPosition - 1.f) * vec2(1.f, -1.f), 0.f, 1.f);
    if(gl_Position.x < -1.f || gl_Position.x > 1.f || gl_Position.y < -1.f || gl_Position.y > 1.f) {
        DISCARD;
    }
    gl_PointSize = a_size * u_pointSizeFactor;
    if(gl_PointSize == 0.f) {
        DISCARD;
    }
    v_color = unpackColor(a_color);
    if(v_color.a == 0.f) {
        DISCARD;
    }
    v_marker = markerAtlasCoords(a_markerIndex);
}

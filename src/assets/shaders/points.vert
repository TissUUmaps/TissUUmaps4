#version 300 es

#define MAX_N_OBJECTS 256 // WebGLPointsController.MAX_N_OBJECTS
#define MARKER_ATLAS_GRID_SIZE 4u
#define NUM_MARKERS_PER_CHANNEL 16u  // MARKER_ATLAS_GRID_SIZE * MARKER_ATLAS_GRID_SIZE

layout(location = 0) in float a_x;
layout(location = 1) in float a_y;
layout(location = 2) in float a_size;
layout(location = 3) in uint a_color;
layout(location = 4) in uint a_markerIndex;
layout(location = 5) in uint a_objectIndex;

layout(std140) uniform DataToWorldTransformsUBO {
    // https://learnopengl.com/Advanced-OpenGL/Advanced-GLSL
    // Matrices are stored as a large array of column vectors,
    // where each of those vectors has a base alignment of vec4.
    // Vectors have a base alignment of 2N (vec2) or 4N (vec3, vec4),
    // where N is the size of the base type (4 bytes for float).
    // Thus, mat2x4 has a base alignment of 4N, and each column
    // is aligned to 4N. Since mat2x4 has 2 columns, its
    // base alignment is 2 * 4N = 8N = 32 bytes.
    mat2x4 dataToWorldTransforms[MAX_N_OBJECTS];
};
uniform mat3x2 u_worldToViewportTransform;
uniform float u_sizeFactor;

flat out uvec3 v_marker;
flat out vec4 v_color;

void main() {
    mat3x2 dataToWorldTransform = mat3x2(transpose(dataToWorldTransforms[a_objectIndex]));
    vec2 worldPosition = dataToWorldTransform * vec3(a_x, a_y, 1.0f);
    vec2 viewportPosition = u_worldToViewportTransform * vec3(worldPosition, 1.0f); // in [0, 1]
    gl_Position = vec4((2.0f * viewportPosition - 1.0f) * vec2(1.0f, -1.0f), 0.0f, 1.0f);
    gl_PointSize = a_size * u_sizeFactor;
    uint markerRow = (a_markerIndex % NUM_MARKERS_PER_CHANNEL) / MARKER_ATLAS_GRID_SIZE;
    uint markerCol = (a_markerIndex % NUM_MARKERS_PER_CHANNEL) % MARKER_ATLAS_GRID_SIZE;
    uint markerChannel = a_markerIndex / NUM_MARKERS_PER_CHANNEL;
    v_marker = uvec3(markerRow, markerCol, markerChannel);
    float colorRed = float((a_color >> 24) & 0xFFu) / 255.0f;
    float colorGreen = float((a_color >> 16) & 0xFFu) / 255.0f;
    float colorBlue = float((a_color >> 8) & 0xFFu) / 255.0f;
    float colorAlpha = float(a_color & 0xFFu) / 255.0f;
    v_color = vec4(colorRed, colorGreen, colorBlue, colorAlpha);
    if(colorAlpha == 0.0f) {
        gl_Position = vec4(2.0f, 2.0f, 2.0f, 0.0f);
    }
}

#version 300 es

#define NMAX 256 // WebGLPointsController.NMAX
#define MARKER_ATLAS_GRID_SIZE 4u
#define NUM_MARKERS_PER_CHANNEL 16u  // MARKER_ATLAS_GRID_SIZE * MARKER_ATLAS_GRID_SIZE

layout(location = 0) in uint a_i;
layout(location = 1) in float a_x;
layout(location = 2) in float a_y;
layout(location = 3) in float a_size;
layout(location = 4) in vec3 a_color;
layout(location = 5) in uint a_visibility;
layout(location = 6) in float a_opacity;
layout(location = 7) in uint a_markerIndex;

layout(std140) uniform DataToWorldTransformsUBO {
    mat3 transform[NMAX];
} u_dataToWorldTransformsUBO;
uniform mat3 u_worldToViewportTransform;

flat out uvec3 v_marker;
flat out vec4 v_color;

void main() {
    vec3 dataPosition = vec3(a_x, a_y, 1.0f);
    vec3 worldPosition = u_dataToWorldTransformsUBO.transform[a_i] * dataPosition;
    vec3 viewportPosition = u_worldToViewportTransform * worldPosition; // normalized to [0, 1]
    gl_Position = vec4((2.0f * viewportPosition.xy - 1.0f) * vec2(1.0f, -1.0f), 0.0f, 1.0f);
    gl_PointSize = a_size;
    uint markerRow = (a_markerIndex % NUM_MARKERS_PER_CHANNEL) / MARKER_ATLAS_GRID_SIZE;
    uint markerCol = (a_markerIndex % NUM_MARKERS_PER_CHANNEL) % MARKER_ATLAS_GRID_SIZE;
    uint markerChannel = a_markerIndex / NUM_MARKERS_PER_CHANNEL;
    v_marker = uvec3(markerRow, markerCol, markerChannel);
    v_color = vec4(a_color, a_visibility > 0u ? a_opacity : 0.0f);
}

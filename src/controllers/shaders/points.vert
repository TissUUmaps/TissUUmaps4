#version 300 es

#define MAX_NUM_TRANSFORMS 256
#define MARKER_ATLAS_GRID_SIZE 4u
#define NUM_MARKERS_PER_CHANNEL 16u  // MARKER_ATLAS_GRID_SIZE * MARKER_ATLAS_GRID_SIZE

layout(std140) uniform TransformsUBO {
    mat3 transforms[MAX_NUM_TRANSFORMS];
} u_transformsUBO;
uniform mat3 u_viewTransform;

layout(location = 0) in float a_x;
layout(location = 1) in float a_y;
layout(location = 2) in float a_size;
layout(location = 3) in vec3 a_color;
layout(location = 4) in float a_opacity;
layout(location = 5) in uint a_markerIndex;
layout(location = 6) in uint a_transformIndex;

flat out vec4 v_color;
flat out uvec3 v_markerOrigin;

void main() {
    vec3 dataPosition = vec3(a_x, a_y, 1.0f);
    vec3 worldPosition = u_transformsUBO.transforms[a_transformIndex] * dataPosition;
    vec3 ndcPosition = u_viewTransform * worldPosition;
    gl_Position = vec4(ndcPosition.xy, 0.0f, 1.0f);
    gl_PointSize = a_size;
    v_color = vec4(a_color.rgb, a_opacity);
    uint markerRow = (a_markerIndex % NUM_MARKERS_PER_CHANNEL) / MARKER_ATLAS_GRID_SIZE;
    uint markerCol = (a_markerIndex % NUM_MARKERS_PER_CHANNEL) % MARKER_ATLAS_GRID_SIZE;
    uint markerChannel = a_markerIndex / NUM_MARKERS_PER_CHANNEL;
    v_markerOrigin = uvec3(markerRow, markerCol, markerChannel);
}

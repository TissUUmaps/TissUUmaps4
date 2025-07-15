#version 300 es

#define MAX_NUM_MODEL_TRANSFORMS 256

uniform mat3 u_modelTransforms[MAX_NUM_MODEL_TRANSFORMS];
uniform mat3 u_viewTransform;

layout(location = 0) in vec2 a_position;
layout(location = 1) in int a_modelTransformIndex;
layout(location = 2) in float a_size;
layout(location = 3) in vec2 a_markerOrigin;
layout(location = 4) in vec3 a_color;
layout(location = 5) in float a_opacity;

flat out vec2 v_markerOrigin;
flat out vec4 v_color;

void main() {
    vec3 dataPosition = vec3(a_position.xy, 1.0f);
    vec3 worldPosition = u_modelTransforms[a_modelTransformIndex] * dataPosition;
    vec3 ndcPosition = u_viewTransform * worldPosition;
    gl_Position = vec4(ndcPosition.xy, 0.0f, 1.0f);
    gl_PointSize = a_size;
    v_markerOrigin = a_markerOrigin;
    v_color = vec4(a_color.rgb, a_opacity);
}

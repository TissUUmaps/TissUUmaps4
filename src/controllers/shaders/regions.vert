#version 300 es

#define MAX_NUM_IMAGES 192

uniform mat2 u_viewportTransform;
uniform vec2 u_canvasSize;
uniform int u_transformIndex;
uniform vec4 u_imageBounds;
uniform int u_numScanlines;

layout(std140) uniform TransformUniforms {
    mat2x4 imageToViewport[MAX_NUM_IMAGES];
} u_transformUBO;

// Need to have attribute 0 enabled, otherwise some browsers (QtWebEngine)
// will give performance warnings. It would otherwise have been simpler to
// just compute the position/texcoord from gl_VertexID.
layout(location = 0) in vec2 in_position;

out vec2 v_texCoord;
out vec2 v_localPos;
out float v_scanline;
flat out float v_pixelWidth;

void main() {
    v_texCoord = in_position;
    v_scanline = v_texCoord.y * float(u_numScanlines);

    vec2 localPos;
    localPos.x = v_texCoord.x * u_imageBounds.z;
    localPos.y = v_texCoord.y * u_imageBounds.w;
    v_localPos = localPos;

    mat3x2 imageToViewport = mat3x2(transpose(u_transformUBO.imageToViewport[u_transformIndex]));
    vec2 viewportPos = imageToViewport * vec3(localPos, 1.0);
    vec2 ndcPos = viewportPos * 2.0 - 1.0;
    ndcPos.y = -ndcPos.y;
    ndcPos = u_viewportTransform * ndcPos;

    // Calculate pixel width in local coordinates. Need to do it here in the
    // vertex shader, because using pixel derivatives in the fragment shader
    // can cause broken stroke lines for large coordinates.
    vec2 ndcPos2 = ndcPos + 0.7 / u_canvasSize;
    mat2 viewportToLocal = inverse(u_viewportTransform * mat2(imageToViewport));
    v_pixelWidth = length(viewportToLocal * (ndcPos2 - ndcPos));

    gl_Position = vec4(ndcPos, 0.0, 1.0);
}
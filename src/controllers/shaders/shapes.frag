#version 300 es

#define ALPHA 1.0
#define STROKE_WIDTH 1.5
#define STROKE_WIDTH_FILLED 1.0
#define FILL_RULE_NEVER 0
#define FILL_RULE_NONZERO 1
#define FILL_RULE_ODDEVEN 2
#define USE_OCCUPANCY_MASK 1
#define SHOW_PIVOT_SPLIT_DEBUG 0
#define SHOW_WORK_VISITED_BBOXES_DEBUG 0

precision highp float;
precision highp int;

uniform int u_numScanlines;
uniform float u_regionOpacity;
uniform float u_regionStrokeWidth;
uniform int u_regionFillRule;
uniform int u_regionUsePivotSplit;
uniform int u_regionUseColorByID;
uniform highp sampler2D u_regionData;
uniform highp sampler2D u_regionLUT;

in vec2 v_texCoord;
in vec2 v_localPos;
in float v_scanline;
flat in float v_pixelWidth;

layout(location = 0) out vec4 out_color;

float distPointToLine(vec2 p, vec2 v0, vec2 v1) {
    // Compute distance by first transforming the point p to the frame
    // defined by the line segment (v0, v1) and its normal vector. This
    // should be more robust and handle small distances to long line
    // segments better than just projecting the point onto the line.

    float a = length(v1 - v0);
    float b = length(p - v0);
    float c = length(p - v1);
    vec2 T = (v1 - v0) / (a + 1e-5);
    vec2 N = vec2(T.y, -T.x);
    vec2 t = mat2(T, N) * (p - v0);
    return (0.0 < t.x && t.x < a) ? abs(t.y) : min(b, c);
}

void main() {
    vec4 color = vec4(0.0);

    vec2 p = v_localPos;  // Current sample position
    int scanline = int(v_scanline);

    // float pixelWidth = length(dFdx(p.xy));  // Can cause precision problems!
    float pixelWidth = v_pixelWidth;  // Safer

    float strokeWidthPixels = u_regionStrokeWidth *
        (u_regionFillRule == FILL_RULE_NEVER ? STROKE_WIDTH : STROKE_WIDTH_FILLED);
    // For proper anti-aliasing, clamp stroke width to at least 1 pixel, and
    // make thinner strokes fade by coverage
    float strokeWidth = max(1.0, strokeWidthPixels) * pixelWidth;
    float strokeFade = min(1.0, strokeWidthPixels);

    float minEdgeDist = 1e7;  // Distance to closest edge

    vec4 scanlineInfo = texelFetch(u_regionData, ivec2(scanline, 0), 0);
    int offset = int(scanlineInfo.x) + 4096 * int(scanlineInfo.y);

#if USE_OCCUPANCY_MASK
    // Do coarse empty space skipping first, by testing sample position against
    // occupancy bitmask stored in the first texel of the scanline.
    // Note: since the mask does not take the stroke width into account,
    // rendering thicker strokes with this enabled can result in artifacts.
    uvec4 maskData = uvec4(texelFetch(u_regionData, ivec2(offset & 4095, offset >> 12), 0));
    int bitIndex = int(v_texCoord.x * 63.9999);
    if((maskData[bitIndex >> 4] & (1u << (bitIndex & 15))) == 0u) {
        discard;
    }
#endif  // USE_OCCUPANCY_MASK

    float scanDir = 1.0;  // Can be positive or negative along the X-axis
    if(bool(u_regionUsePivotSplit)) {
        float pivot = texelFetch(u_regionData, ivec2((offset + 1) & 4095, (offset + 1) >> 12), 0).x;
        scanDir = p.x < pivot ? -1.0 : 1.0;
        if(p.x >= pivot) {
            scanlineInfo = texelFetch(u_regionData, ivec2(scanline + u_numScanlines, 0), 0);
            offset = int(scanlineInfo.x) + 4096 * int(scanlineInfo.y);
        }
    }

    offset += 2;  // Position pointer at first bounding box
    vec4 headerData = texelFetch(u_regionData, ivec2(offset & 4095, offset >> 12), 0);
    int objectID = int(headerData.z) - 1;
    int windingNumber = 0;
    int visitedBBoxes = 0;

    while(headerData.w != 0.0) {
        // Find next path with bounding box overlapping this sample position
        while(headerData.w != 0.0) {
            headerData = texelFetch(u_regionData, ivec2(offset & 4095, offset >> 12), 0);
            bool isPathBbox = headerData.z > 0.0;
            bool isClusterBbox = headerData.z == 0.0;
            visitedBBoxes += 1;

            if(headerData.x <= (p.x + strokeWidth) && (p.x - strokeWidth) <= headerData.y) {
                if(isPathBbox) {
                    break;
                }
                if(isClusterBbox) {
                    offset -= int(headerData.w);
                }
            }
            offset += int(headerData.w) + 1;
        }
        offset += 1;  // Position pointer at first edge element

        // Check if we are done for this object ID and need to update the color value
        if(objectID != int(headerData.z) - 1) {
            bool isInside = false;
            if(u_regionFillRule == FILL_RULE_NONZERO) {
                isInside = windingNumber != 0;
            }
            if(u_regionFillRule == FILL_RULE_ODDEVEN) {
                isInside = (windingNumber & 1) == 1;
            }

            if(isInside || minEdgeDist < strokeWidth) {
                vec4 objectColor = texelFetch(u_regionLUT, ivec2(objectID & 4095, objectID >> 12), 0);
                if(bool(u_regionUseColorByID)) {
                    // Map object ID to a unique color from low-discrepancy sequence
                    objectColor.rgb = fract(sqrt(vec3(2.0, 3.0, 5.0)) * float(objectID + 1));
                }
            #if SHOW_PIVOT_SPLIT_DEBUG
                if(bool(u_regionUsePivotSplit)) {
                    objectColor.rgb = scanDir > 0.0 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 1.0);
                }
            #endif  // SHOW_PIVOT_SPLIT_DEBUG
                float minEdgeDistSigned = isInside ? minEdgeDist : -minEdgeDist;
                float strokeOpacity = smoothstep(strokeWidth, strokeWidth - pixelWidth, minEdgeDist) * strokeFade;
                float fillOpacity = smoothstep(-pixelWidth, pixelWidth, minEdgeDistSigned) * u_regionOpacity;
                objectColor.a *= clamp(strokeOpacity + fillOpacity, 0.0, 1.0);

                color.a = objectColor.a + (1.0 - objectColor.a) * color.a;
                color.rgb = mix(color.rgb, objectColor.rgb, objectColor.a);
            }

            windingNumber = 0;  // Reset intersection count
            minEdgeDist = 1e7;  // Reset distance to closest edge
            objectID = int(headerData.z) - 1;
        }

        // Do intersection tests with edge elements to update intersection count,
        // and also update the edge distance needed for outline rendering
        int count = int(headerData.w);
        for(int i = 0; i < count; ++i) {
            vec4 edgeData = texelFetch(u_regionData, ivec2((offset + i) & 4095, (offset + i) >> 12), 0);
            vec2 v0 = edgeData.xy;
            vec2 v1 = edgeData.zw;

            if(min(v0.y, v1.y) <= p.y && p.y < max(v0.y, v1.y)) {
                float t = (p.y - v0.y) / (v1.y - v0.y + 1e-5);
                float x = v0.x + (v1.x - v0.x) * t;
                float weight = 0.0;
                if(u_regionFillRule == FILL_RULE_NONZERO) {
                    weight = sign(v1.y - v0.y);
                }
                if(u_regionFillRule == FILL_RULE_ODDEVEN) {
                    weight = 1.0;
                }
                windingNumber += int(float((x - p.x) * scanDir > 0.0) * weight);
            }
            minEdgeDist = min(minEdgeDist, distPointToLine(p, v0, v1));
        }

        offset += count;
    }

    out_color = color;
    out_color.rgb /= max(1e-5, out_color.a);

#if SHOW_WORK_VISITED_BBOXES_DEBUG
    {
        float t = clamp(float(visitedBBoxes) / 400.0, 0.0, 1.0) * 2.0;
        out_color.rgb = clamp(vec3(t - 1.0, 1.0 - abs(t - 1.0), 1.0 - t), 0.0, 1.0);
    }
#endif  // SHOW_WORK_VISITED_BBOXES_DEBUG
}
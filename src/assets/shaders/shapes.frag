#version 300 es

#define SCANLINE_DATA_WIDTH 4096u
#define SHAPE_DATA_WIDTH 4096u

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#implicit_defaults
precision highp float; // no default otherwise
precision highp int; // defaults to mediump otherwise
precision highp sampler2D; // defaults to lowp otherwise

uniform uint u_numScanlines;
uniform vec4 u_objectBounds; // (x, y, width, height), in data dimensions

/*
 * Scanline data (RGBA32F data texture)
 *
 * Memory layout: [header, scanline 0, scanline 1, ..., scanline N]
 *   Header: [scanline info 1, scanline info 2, ..., scanline info N]
 *      Scanline info = (offset, shape count M, xmin, xmax)
 *   Scanline: [scanline header, shape 1, shape 2, ..., shape M]
 *     Scanline header = (occupancy mask = 4 * 32 = 128 bits)
 *     Shape: [shape header, edge 1, edge 2, ..., edge L]
 *       Shape header = (shape info = shape index, edge count L, xmin, xmax)
 *       Edge = (x0, y0, x1, y1)
 *
 * Notes:
 * - Scanline/shape bounding boxes and edge vertices are in data dimensions
 * - Scanline data relates to the current shape cloud --> one draw call per data object
 * - Scanline/shape bounding boxes and the scanline occupancy masks don't account for stroke widths
 *   (this is why we cannot have shape-specific stroke widths, since strokes grow both inward and outward)
 */
uniform sampler2D u_scanlineData;

/*
 * Shape data (RGBA32F data texture)
 *
 * Memory layout: [shape properties 1, shape properties 2, ..., shape properties L]
 *   Shape properties = (fill color, stroke color, unused, unused)
 */
uniform sampler2D u_shapeData;

in vec2 v_pos; // in data dimensions
in float v_scanline; // in [0, u_numScanlines]
flat in float v_hsw; // half stroke width, in data dimensions

out vec4 fragColor;

// fetches a texel from the given texture tex of length w at a given offset
vec4 texel(sampler2D sampler, uint w, uint offset) {
    ivec2 p = ivec2(int(offset % w), int(offset / w));
    return texelFetch(sampler, p, 0);
}

// checks if a given x coordinate falls into an occupied bin of an 128-bit occupancy mask
bool occupancy(float x, float xMin, float width, vec4 occupancyMask) {
    float xNorm = (x - xMin) / width;
    uint bin = min(uint(128.0 * xNorm), 127u);
    uint value = floatBitsToUint(occupancyMask[bin >> 5]);
    uint bitMask = 1u << (bin & 0x1Fu);
    return (value & bitMask) != 0u;
}

// tests if a point p is left (>0), on (=0), or right (<0) of an infinite line through v0 and v1
// https://web.archive.org/web/20210506231426/http://geomalgorithms.com/a01-_area.html
float isPointLeftOfLine(vec2 p, vec2 v0, vec2 v1) {
    return (v1.x - v0.x) * (p.y - v0.y) - (p.x - v0.x) * (v1.y - v0.y);
}

// computes the minimum distance from point p to the line segment v0-v1
// https://web.archive.org/web/20210507021429/http://geomalgorithms.com/a02-_lines.html
float pointToSegmentDist(vec2 p, vec2 v0, vec2 v1) {
    vec2 v0ToP = p - v0;
    vec2 segment = v1 - v0;
    float segmentLen = length(segment);
    if(segmentLen <= 0.0) {
        return length(v0ToP);
    }
    vec2 unitSegment = segment / segmentLen;
    float segmentCoord = dot(unitSegment, v0ToP);
    if(segmentCoord <= 0.0) {
        return length(v0ToP);
    }
    if(segmentCoord >= segmentLen) {
        return length(p - v1);
    }
    vec2 unitSegmentNormal = vec2(unitSegment.y, -unitSegment.x);
    float segmentNormalCoord = dot(unitSegmentNormal, v0ToP);
    return abs(segmentNormalCoord);
}

// computes the winding number for a given point p and n edges stored in data starting at offset
// https://web.archive.org/web/20210504233957/http://geomalgorithms.com/a03-_inclusion.html
int windingNumber(vec2 p, sampler2D sampler, uint w, uint offset, uint n, float hsw, out float minDist) {
    int wn = 0;
    minDist = 1e38;
    for(uint i = 0u; i < n; ++i) {
        vec4 edge = texel(sampler, w, offset + i);
        vec2 v0 = vec2(edge[0], edge[1]);
        vec2 v1 = vec2(edge[2], edge[3]);
        vec2 e = v1 - v0;
        float len = length(e);
        if(len <= 0.0) {
            continue;
        }
        minDist = min(minDist, pointToSegmentDist(p, v0, v1));
        // extend edge by half stroke width on both ends
        vec2 delta = hsw * e / len;
        vec2 v0long = v0 - delta;
        vec2 v1long = v1 + delta;
        if(v0long.y <= p.y) { // edge starts on/below point
            if(v1long.y > p.y && isPointLeftOfLine(p, v0long, v1long) > 0.0) { // edge ends strictly above point, and point is strictly left of edge
                wn++;
            }
        } else { // edge starts strictly above point
            if(v1long.y <= p.y && isPointLeftOfLine(p, v0long, v1long) < 0.0) { // edge ends on/below point, and point is strictly right of edge
                wn--;
            }
        }
    }
    return wn;
}

// unpacks a uint-packed 8-bit RGBA color
vec4 unpackColor(uint color) {
    float r = float((color >> 24) & 0xFFu) / 255.0;
    float g = float((color >> 16) & 0xFFu) / 255.0;
    float b = float((color >> 8) & 0xFFu) / 255.0;
    float a = float(color & 0xFFu) / 255.0;
    return vec4(r, g, b, a);
}

void main() {
    if(u_numScanlines == 0u || u_objectBounds[2] <= 0.0 || u_objectBounds[3] <= 0.0) {
        discard; // no scanlines or invalid object bounds
    }
    if(v_pos.x < u_objectBounds[0] - v_hsw || v_pos.x > u_objectBounds[0] + u_objectBounds[2] + v_hsw || v_pos.y < u_objectBounds[1] - v_hsw || v_pos.y > u_objectBounds[1] + u_objectBounds[3] + v_hsw) {
        discard; // out of object bounds
    }
    // get scanline info
    uint scanlineInfoOffset = clamp(uint(v_scanline), 0u, u_numScanlines - 1u);
    vec4 scanlineInfo = texel(u_scanlineData, SCANLINE_DATA_WIDTH, scanlineInfoOffset);
    uint scanlineOffset = floatBitsToUint(scanlineInfo[0]);
    uint shapeCount = floatBitsToUint(scanlineInfo[1]);
    if(shapeCount == 0u || v_pos.x < scanlineInfo[2] - v_hsw || v_pos.x > scanlineInfo[3] + v_hsw) {
        discard; // no shapes on this scanline or x coordinate outside scanline bounds
    }
    // check occupancy mask
    vec4 occupancyMask = texel(u_scanlineData, SCANLINE_DATA_WIDTH, scanlineOffset);
    bool occupied = occupancy(v_pos.x, u_objectBounds[0], u_objectBounds[2], occupancyMask);
    for(float dx = u_objectBounds[2] / 128.0; !occupied && dx <= v_hsw; dx += u_objectBounds[2] / 128.0) {
        if(occupancy(v_pos.x - dx, u_objectBounds[0], u_objectBounds[2], occupancyMask) || occupancy(v_pos.x + dx, u_objectBounds[0], u_objectBounds[2], occupancyMask)) {
            occupied = true;
        }
    }
    if(!occupied) {
        discard; // no shapes on this scanline near the given x coordinate
    }
    // iterate over scanline shapes
    fragColor = vec4(0.0);
    uint shapeOffset = scanlineOffset + 1u;
    for(uint i = 0u; i < shapeCount; ++i) {
        vec4 shapeInfo = texel(u_scanlineData, SCANLINE_DATA_WIDTH, shapeOffset);
        uint shapeIndex = floatBitsToUint(shapeInfo[0]);
        uint edgeCount = floatBitsToUint(shapeInfo[1]);
        if(edgeCount > 0u && v_pos.x >= shapeInfo[2] - v_hsw && v_pos.x <= shapeInfo[3] + v_hsw) {
            float minDist;
            if(windingNumber(v_pos, u_scanlineData, SCANLINE_DATA_WIDTH, shapeOffset + 1u, edgeCount, v_hsw, minDist) > 0) { // point is inside shape
                vec4 shapeProperties = texel(u_shapeData, SHAPE_DATA_WIDTH, shapeIndex);
                if(minDist < v_hsw) { // point is inside stroke area
                    vec4 strokeColor = unpackColor(floatBitsToUint(shapeProperties[1]));
                    strokeColor.rgb = strokeColor.rgb * strokeColor.a; // premultiply
                    fragColor = strokeColor + (1.0 - strokeColor.a) * fragColor;
                } else { // point is inside fill area
                    vec4 fillColor = unpackColor(floatBitsToUint(shapeProperties[0]));
                    fillColor.rgb = fillColor.rgb * fillColor.a; // premultiply
                    fragColor = fillColor + (1.0 - fillColor.a) * fragColor;
                }
            }
        }
        shapeOffset += 1u + edgeCount;
    }
}

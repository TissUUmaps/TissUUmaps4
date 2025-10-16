#version 300 es

#define SCANLINE_DATA_WIDTH 4096u
#define SHAPE_DATA_WIDTH 4096u

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#implicit_defaults
precision highp float; // no default otherwise
precision highp int; // defaults to mediump otherwise
precision highp sampler2D; // defaults to mediump otherwise

uniform uint u_numScanlines;
uniform vec4 u_objectBounds; // (xmin, ymin, xmax, ymax), in data dimensions

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
bool occupancy(float x, float xmin, float xmax, vec4 occupancyMask) {
    uint bin = min(uint(128.f * (x - xmin) / (xmax - xmin)), 127u);
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
float pointToLineSegmentDist(vec2 p, vec2 v0, vec2 v1) {
    vec2 u = normalize(v1 - v0); // unit vector of line segment
    vec2 n = vec2(u.y, -u.x); // unit normal vector to line segment
    vec2 t = mat2(u, n) * (p - v0); // coordinates of p in the (u, n) basis
    if(0.f < t.x && t.x < length(v1 - v0)) { // perpendicular projection falls onto line segment
        return abs(t.y); // distance is the absolute normal coordinate
    }
    return min(length(p - v0), length(p - v1)); // distance to closest endpoint
}

// computes the winding number for a given point p and n edges stored in data starting at offset
// https://web.archive.org/web/20210504233957/http://geomalgorithms.com/a03-_inclusion.html
int windingNumber(vec2 p, sampler2D sampler, uint w, uint offset, uint n, float hsw, out float minDist) {
    int wn = 0;
    minDist = 1e38f;
    for(uint i = 0u; i < n; ++i) {
        vec4 e = texel(sampler, w, offset + i);
        vec2 v0 = vec2(e[0], e[1]);
        vec2 v1 = vec2(e[2], e[3]);
        minDist = min(minDist, pointToLineSegmentDist(p, v0, v1));
        // extend edge by half stroke width on both ends
        vec2 delta = hsw * normalize(v1 - v0);
        vec2 v0e = v0 - delta;
        vec2 v1e = v1 + delta;
        if(v0e.y <= p.y) { // edge starts on/below point
            if(v1e.y > p.y && isPointLeftOfLine(p, v0e, v1e) > 0.f) { // edge ends stricly above point, and point is strictly left of edge
                wn++;
            }
        } else { // edge starts stricly above point
            if(v1e.y <= p.y && isPointLeftOfLine(p, v0e, v1e) < 0.f) { // edge ends on/below point, and point is strictly right of edge
                wn--;
            }
        }
    }
    return wn;
}

// unpacks a uint-packed 8-bit RGBA color
vec4 unpackColor(uint color) {
    float r = float((color >> 24) & 0xFFu) / 255.f;
    float g = float((color >> 16) & 0xFFu) / 255.f;
    float b = float((color >> 8) & 0xFFu) / 255.f;
    float a = float(color & 0xFFu) / 255.f;
    return vec4(r, g, b, a);
}

void main() {
    fragColor = vec4(0.f);
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
    float occupancyMaskBinWidth = (u_objectBounds[2] - u_objectBounds[0]) / 128.f; // in data dimensions
    bool occupied = occupancy(v_pos.x, u_objectBounds[0], u_objectBounds[2], occupancyMask);
    for(float dx = occupancyMaskBinWidth; !occupied && dx <= v_hsw; dx += occupancyMaskBinWidth) {
        if(occupancy(v_pos.x - dx, u_objectBounds[0], u_objectBounds[2], occupancyMask) || occupancy(v_pos.x + dx, u_objectBounds[0], u_objectBounds[2], occupancyMask)) {
            occupied = true;
        }
    }
    if(!occupied) {
        discard; // no shapes on this scanline near the given x coordinate
    }
    // iterate over scanline shapes
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
                    // TODO update fragColor
                } else { // point is inside fill area
                    vec4 fillColor = unpackColor(floatBitsToUint(shapeProperties[0]));
                    // TODO update fragColor
                }
            }
        }
        shapeOffset += 1u + edgeCount;
    }
}

#version 300 es

#define SHAPES_TEXTURE_WIDTH 4096u
#define SHAPES_TEXTURE_WIDTH_LOG2 12u  // log2(SHAPES_TEXTURE_WIDTH)
#define SHAPES_TEXTURE_WIDTH_MASK 0xFFFu  // SHAPES_TEXTURE_WIDTH - 1

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#implicit_defaults
precision highp float; // no default otherwise
precision highp int; // defaults to mediump otherwise
precision highp sampler2D;  // defaults to lowp otherwise

in vec2 v_viewportPos; // in [0, 1]
in vec2 v_worldPos; // in world coordinates
in float v_scanline; // in [0, u_numScanlines]

/*
 * Scanline data (RGBA32F data texture)
 *
 * Memory layout: [header, scanline data 0, scanline data 1, ..., scanline data N]
 *   Header: [scanline info 1, scanline info 2, ..., scanline info N]
 *      Scanline info = (offset, shape count M, xmin, xmax)
 *   Scanline data: [scanline header, shape data 1, shape data 2, ..., shape data M]
 *     Scanline header = (4 * 32 = 128 bit occupancy mask)
 *     Shape data: [shape header, edge data 1, edge data 2, ..., edge data L]
 *       Shape header = (id, edge count L, xmin, xmax)
 *       Edge data = (x0, y0, x1, y1)
 */
uniform sampler2D u_scanlineData;

/*
 * Shape properties (RGBA32F data texture)
 *
 * Memory layout: [shape properties 1, shape properties 2, ..., shape properties L]
 *   Shape properties = (fill color, unused, line width, line color)
 */
uniform sampler2D u_shapeProperties;

out vec4 fragColor;

// converts a 1D texel offset into 2D texel coordinates
ivec2 getTexelCoords(uint offset) {
    return ivec2(offset & SHAPES_TEXTURE_WIDTH_MASK, offset >> SHAPES_TEXTURE_WIDTH_LOG2);
}

// tests if a point p is left (>0), on (=0), or right (<0) of an infinite line through v0 and v1
// https://web.archive.org/web/20210506231426/http://geomalgorithms.com/a01-_area.html
float isLeft(vec2 p, vec2 v0, vec2 v1) {
    return (v1.x - v0.x) * (p.y - v0.y) - (p.x - v0.x) * (v1.y - v0.y);
}

// compute the winding number for a given point p and n edges stored in data starting at offset
// https://web.archive.org/web/20210504233957/http://geomalgorithms.com/a03-_inclusion.html
int computeWindingNumber(vec2 p, sampler2D data, uint offset, uint n) {
    int wn = 0;
    for(uint i = 0u; i < n; ++i) {
        vec4 e = texelFetch(data, getTexelCoords(offset + i), 0);
        vec2 v0 = vec2(e[0], e[1]);
        vec2 v1 = vec2(e[2], e[3]);
        if(v0.y <= p.y) { // edge starts on/below point
            if(v1.y > p.y && isLeft(p, v0, v1) > 0.0f) { // edge ends above point and point is strictly left of edge
                wn++;
            }
        } else { // edge starts above point
            if(v1.y <= p.y && isLeft(p, v0, v1) < 0.0f) { // edge ends on/below point and point is strictly right of edge
                wn--;
            }
        }
    }
    return wn;
}

// unpacks a uint-packed 8-bit RGBA color
vec4 unpackColor(uint color) {
    float r = float((color >> 24) & 0xFFu) / 255.0f;
    float g = float((color >> 16) & 0xFFu) / 255.0f;
    float b = float((color >> 8) & 0xFFu) / 255.0f;
    float a = float(color & 0xFFu) / 255.0f;
    return vec4(r, g, b, a);
}

void main() {
    // get scanline info
    uint scanlineInfoOffset = uint(v_scanline);
    vec4 scanlineInfo = texelFetch(u_scanlineData, getTexelCoords(scanlineInfoOffset), 0);
    uint scanlineDataOffset = floatBitsToUint(scanlineInfo[0]);
    uint shapeCount = floatBitsToUint(scanlineInfo[1]);
    if(shapeCount == 0u || v_worldPos.x < scanlineInfo[2] || v_worldPos.x > scanlineInfo[3]) {
        discard; // scanline doesn't contain shapes at all or at the given position (bounding box test)
    }
    // test 128-bit occupancy mask
    uint occupancyMaskOffset = scanlineDataOffset;
    vec4 occupancyMask = texelFetch(u_scanlineData, getTexelCoords(occupancyMaskOffset), 0);
    uint occupancyMaskBin = min(uint(v_viewportPos.x * 128.0f), 127u);
    uint occupancyMaskComponentValue = floatBitsToUint(occupancyMask[occupancyMaskBin >> 5]);
    uint occupancyMaskComponentValueBitIndex = occupancyMaskBin & 0x1Fu;
    if((occupancyMaskComponentValue & (1u << occupancyMaskComponentValueBitIndex)) == 0u) {
        discard; // scanline doesn't contain shapes at the given position (occupancy mask test)
    }
    // iterate over scanline shapes
    uint currentShapeDataOffset = scanlineDataOffset + 1u;
    for(uint i = 0u; i < shapeCount; ++i) {
        uint shapeInfoOffset = currentShapeDataOffset;
        vec4 shapeInfo = texelFetch(u_scanlineData, getTexelCoords(shapeInfoOffset), 0);
        uint shapeIndex = floatBitsToUint(shapeInfo[0]);
        uint edgeCount = floatBitsToUint(shapeInfo[1]);
        if(v_worldPos.x >= shapeInfo[2] && v_worldPos.x <= shapeInfo[3]) { // the current shape's bounding box contains the given position
            int windingNumber = computeWindingNumber(v_worldPos, u_scanlineData, currentShapeDataOffset + 1u, edgeCount);
            if(windingNumber > 0) { // the current shape contains the given position
                uint shapePropsOffset = shapeIndex;
                vec4 shapeProps = texelFetch(u_shapeProperties, getTexelCoords(shapePropsOffset), 0);
                vec4 fillColor = unpackColor(floatBitsToUint(shapeProps[0]));
                uint lineWidth = floatBitsToUint(shapeProps[2]);
                vec4 lineColor = unpackColor(floatBitsToUint(shapeProps[3]));
                // TODO perform alpha blending for fill & line
            }
        }
        currentShapeDataOffset += 1u + edgeCount;
    }
    // TODO set fragment color
}

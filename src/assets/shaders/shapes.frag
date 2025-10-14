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

// [header, scanline data 0, scanline data 1, ..., scanline data N]
//   header: [scanline info 1, scanline info 2, ..., scanline info N]
//      scanline info = (offset, shape count M, xmin, xmax)
//   scanline data: [scanline header, shape data 1, shape data 2, ..., shape data M]
//     scanline header = (4 * 32 = 128 bit occupancy mask)
//     shape data: [shape header, edge data 1, edge data 2, ..., edge data L]
//       shape header = (id, edge count L, xmin, xmax)
//       edge data = (x0, y0, x1, y1)
uniform sampler2D u_scanlineData;

// [shape 1, shape 2, ..., shape N]
//   shape = (color, outline, outline color, unused)
uniform sampler2D u_shapeProperties;

out vec4 fragColor;

ivec2 getTexelCoords(uint offset) {
    return ivec2(offset & SHAPES_TEXTURE_WIDTH_MASK, offset >> SHAPES_TEXTURE_WIDTH_LOG2);
}

void main() {
    // check scanline info
    uint scanlineInfoOffset = uint(v_scanline);
    vec4 scanlineInfo = texelFetch(u_scanlineData, getTexelCoords(scanlineInfoOffset), 0);
    uint scanlineDataOffset = floatBitsToUint(scanlineInfo[0]);
    uint shapeCount = floatBitsToUint(scanlineInfo[1]);
    if(shapeCount == 0u || v_viewportPos.x < scanlineInfo[2] || v_viewportPos.x > scanlineInfo[3]) {
        discard;
    }
    // check occupancy mask
    uint occupancyMaskOffset = scanlineDataOffset;
    vec4 occupancyMask = texelFetch(u_scanlineData, getTexelCoords(occupancyMaskOffset), 0);
    uint occupancyMaskBin = min(uint(v_viewportPos.x * 128.0f), 127u);
    uint occupancyMaskComponentValue = floatBitsToUint(occupancyMask[occupancyMaskBin >> 5]);
    uint occupancyMaskComponentValueBitIndex = occupancyMaskBin & 0x1Fu;
    if((occupancyMaskComponentValue & (1u << occupancyMaskComponentValueBitIndex)) == 0u) {
        discard;
    }
    // iterate over shapes
    uint currentShapeDataOffset = scanlineDataOffset + 1u;
    for(uint i = 0u; i < shapeCount; ++i) {
        // check shape info
        uint shapeInfoOffset = currentShapeDataOffset;
        vec4 shapeInfo = texelFetch(u_scanlineData, getTexelCoords(shapeInfoOffset), 0);
        uint shapeIndex = floatBitsToUint(shapeInfo[0]);
        uint edgeCount = floatBitsToUint(shapeInfo[1]);
        if(v_viewportPos.x >= shapeInfo[2] && v_viewportPos.x <= shapeInfo[3]) {
            // iterate over edges
            for(uint j = 0u; j < edgeCount; ++j) {
                // intersection testing
                uint edgeDataOffset = currentShapeDataOffset + 1u + j;
                vec4 edgeData = texelFetch(u_scanlineData, getTexelCoords(edgeDataOffset), 0);
                vec2 v0 = vec2(edgeData[0], edgeData[1]);
                vec2 v1 = vec2(edgeData[2], edgeData[3]);
                // TODO implement intersection testing
                uint shapePropsOffset = shapeIndex;
                vec4 shapeProps = texelFetch(u_shapeProperties, getTexelCoords(shapePropsOffset), 0);
                uint shapeColor = floatBitsToUint(shapeProps[0]);
                uint shapeOutline = floatBitsToUint(shapeProps[1]);
                uint shapeOutlineColor = floatBitsToUint(shapeProps[2]);
            }
        }
        currentShapeDataOffset += 1u + edgeCount;
    }
}

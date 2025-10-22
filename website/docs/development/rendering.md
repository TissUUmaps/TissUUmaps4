---
sidebar_position: 4
---

# Rendering

**OpenSeadragon** is used for displaying images and labels. OpenSeadragon was chosen over other alternatives for maturity (stability, large community, active development) and legacy (TissUUmaps 3) reasons.

The **WebGL 2** API is used for rendering points and shapes. WebGL was chosen over WebGPU for browser compatibility (e.g. Firefox) and legacy (TissUUmaps 3) reasons.

## Images

Custom tile sources are used to enable additional file formats (e.g. TIFF).

## Labels

Custom tile sources are used to enable loading of 8/16/32-bit unsigned integer label masks (TIFF/Zarr).

## Points

Since point attributes (marker, size, color, visibility, opacity, ...) are configurable for each individual point, points are rendered naively (i.e., no instancing). To enable partial attribute updates, data is loaded using separate buffers for each coordinate/property. However, color, visibility and opacity are packed into a single 32-bit RGBA value for memory efficiency. Marker shapes are loaded from a "marker atlas" texture, which holds signed distance fields that have been pre-multiplied by a constant factor and quantized into unsigned 8-bit integers for memory efficiency.

## Shapes

For shapes, the following two alternative approaches have been considered:

### Standard approach

Overview:

1. Triangulate shapes on the CPU, e.g. using [earcut](https://github.com/mapbox/earcut)
   - If necessary, only triangulate visible shapes --> quadtree?
   - If necessary, only re-triangulate when necessary (e.g. drawing)
2. Transfer triangle coordinates to the GPU using an element array buffer
   - If necessary, only transfer visible triangles --> quadtree?
3. Call `gl.drawElements()` with `gl.TRIANGLES` and `count = # triangles`
   - The vertex shader will run once for every vertex and output `gl_Position` (interpolated) and varyings such as `v_color` and `v_opacity` (both flat)
   - The fragment shader will run once for every pixel of every triangle (i.e., overdraw will result in several runs for the same pixel) and output `color`

### Compute shader approach

Overview:

- Construct an edge table and occupancy mask on the CPU
- Provide the edge table/occupancy mask to the GPU using a custom data textures
  - If necessary, only transfer visible data --> quadtree?
- Call `gl.drawArraysInstanced()` with `gl.TRIANGLE_STRIP` and `instanceCount = 1` for a single quad (global bounding box)
  - The vertex shader will run once and merely passes through quad coordinates
  - The fragment shader will run once for each pixel in the global bounding box:
    1. Check global occupancy mask to quickly discard fragments in empty areas
    2. Based on their bounding boxes (stored in edge table), collect shapes (paths) that are potentially overlapping with the current fragment position
    3. For each path, calculate the winding number (scanline intersection testing); also, calculate the minimum distance from the current fragment to all line segments of the path
    4. Determine if the current fragment is inside the paths or close enough to be part of the shapes' strokes. If yes, compute the fill/stroke color and opacity of the fragment using standard alpha blending (separate fill/stroke opacities are used for anti-aliasing)

### Comparison

|                                  | Standard approach                                                                                                                          | Compute shader approach                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **CPU load**                     | High (triangulation)                                                                                                                       | **Low** (edge table/occupancy mask construction)                                                                     |
| **Memory usage**                 | O(shapes \* triangles per shape \* 3)                                                                                                      | **O(shapes \* vertices per shape)**, but arbitrary limit wrt. how many vertices/shapes can overlap the same scanline |
| **Data transfer**                | Using element array buffers                                                                                                                | Using custom data textures                                                                                           |
| **GPU performance**              | Vertex shader transforms vertex coordinates in parallel; **cheap** fragment shader runs **for each fragment of each triangle** in parallel | Vertex shader does nothing; **VERY expensive** fragment shader runs **for each foreground pixel** in parallel        |
| **Outlines**                     | Difficult (separately triangulate outlines?)                                                                                               | **Easy** (thickness is efficiently defined within shader), but no arbitrary thickness                                |
| **Blending**                     | **Built-in alpha blending**, but requires explicit depth-sorting on the CPU                                                                | Explicitly computed, but still requires depth sorting on the CPU                                                     |
| **Anti-aliasing**                | Low quality (MSAA)                                                                                                                         | **High quality** (sub-pixel precision in distance calculation)                                                       |
| **Implementation / maintenance** | **Easy**                                                                                                                                   | Difficult                                                                                                            |

### Decision

TODO

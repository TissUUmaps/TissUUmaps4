---
sidebar_position: 6
---

# Rendering

**OpenSeadragon** is used for displaying images and labels. OpenSeadragon was chosen over other alternatives for maturity (stability, large community, active development) and legacy (TissUUmaps 3) reasons.

Custom **WebGL 2** shaders are used for rendering points and shapes. WebGL was chosen over WebGPU for browser compatibility (e.g. Firefox) and legacy (TissUUmaps 3) reasons.

## Images

Custom tile sources are used to enable additional file formats (e.g. TIFF, Zarr); the OME-Zarr tile source comes from the external `omezarr-tilesource` package.

Image data is either multi-channel (`getSizeC()` returns the number of channels), providing one tile source per channel, or not, providing a single grayscale or color tile source that is drawn as it is.

Multi-channel image data that implements `getChannelData()` provides a single sample ("grayscale value") per pixel and channel. Each channel is then recolored by a data transfer (see [Code architecture](./code-architecture.md#tissuumapsrender)) that scales the values linearly between the channel's contrast limits, clamps them to `[0, 1]` and multiplies them with the channel color. Multi-channel image data that does not implement `getChannelData()` is free to provide grayscale or RGB tile sources per channel, which are drawn as they are.

Colors and contrast limits are taken from the image's channel settings, falling back to those reported by the image data. Channels without a color are always colorized with a default color derived from the channel index (`RenderUtils.getDefaultChannelColor`, based on QuPath's palette: red, green, blue, yellow, cyan, magenta, ...); if a data provider knows colors for only some channels, it is responsible for returning suitable defaults for the remaining ones itself, so that the index-based fallback does not mix with colors from image metadata. Channels without contrast limits are stretched over the value range of their data type. Channel, image and layer opacity are applied by OpenSeadragon when drawing.

## Labels

Custom tile sources are used to enable loading of 8/16/32-bit unsigned integer label masks (TIFF/Zarr).

Label tiles carry label IDs rather than colors. They are recolored by a data transfer that looks each ID up in a color table resolved per object from the label color, visibility and opacity configurations, with visibility and opacity folded into the alpha channel; ID `0` is transparent, and IDs without an entry get a default appearance. Transfers are kept per tile source, so the navigator is recolored as well, and are only rebuilt when the data or a configuration changes.

## Points

All point clouds are rendered in a single pass (i.e., a single draw call) using flat buffers. The vertex shader is executed once per point, the fragment shader once per fragment of each point sprite. Since point attributes (marker, size, color, visibility, opacity, ...) are individually configurable for each point, points are rendered naively (i.e., no instancing).

To enable partial attribute updates, data is loaded using separate buffers for each coordinate/property. However, point color, visibility and opacity values are packed into joint 32-bit RGBA values for memory efficiency. Marker shapes are loaded from a "marker atlas" texture, which holds signed distance fields (SDFs) that have been pre-multiplied by a constant factor and quantized into unsigned 8-bit integers for memory efficiency. The atlas is a 4×4 grid with one marker per RGBA channel, i.e. at most 64 markers; per-object uniforms are passed in a uniform buffer sized for at most 512 objects (the guaranteed minimum uniform block size).

## Shapes

Shapes are rendered in multiple passes (i.e., one draw call per shape cloud) using separate data textures for each shape cloud. A "compute shader approach" is employed, where the vertex shader merely runs on the viewport corners (i.e., executed precisely four times) and the fragment shader implements a custom rendering pipeline (i.e., executed for all fragments of the entire viewport).

Partial updates are enabled implicitly by using separate data textures for each shape cloud (update individual shape clouds) and each property (update individual shape cloud properties). However, shape fill/stroke color, visibility and opacity values are packed into joint 32-bit RGBA values for memory efficiency.

The custom rendering pipeline is based on scanline rendering, with the following modifications/optimizations:

- Scanline data (edge lists) are stored in separate data textures for each shape cloud
- Scanlines relate to the shape cloud bounds (as opposed to viewport/world bounds) to allow for infinite worlds
- Each scanline holds a one-dimensional bounding box and a 128-bit occupancy mask for rapidly discarding fragments (dilated by half the stroke width, so strokes near a bin edge survive)
- For each scanline, edges are processed separately for each shape to ensure proper compositing
- Each shape holds a one-dimensional bounding box per scanline for rapidly skipping shapes
- An optimized winding number algorithm is used for point-in-polygon testing
- An optimized point-to-segment distance algorithm is used for stroke drawing

Specifically, the approach works as follows:

- Construct scanline data for each shape cloud on the CPU and transfer them into data textures on the GPU
- For each shape cloud, call `gl.drawArrays()` with `gl.TRIANGLE_STRIP` for the viewport bounding box (single quad)
  - The vertex shader will run once per viewport corner, converting viewport coordinates to data coordinates
  - The fragment shader will run once for each fragment in the viewport:
    1. Determine the current scanline from the (interpolated) scanline varying
    2. Check the scanline bounding box and occupancy mask to quickly discard empty viewport fragments
    3. For each shape in the scanline potentially overlapping with the current fragment (check shape bounding box), compute the winding number and the minimum point-to-segment distance for the current fragment; if the current fragment is close enough to one of the shape's segments, blend the fragment color with the shape's stroke color; otherwise, if the current fragment is within the shape (non-zero winding number), blend the fragment color with the shape's fill color

The number of scanlines (default 512) is a render option, and the stroke width is a single uniform shared by all shapes, which is why per-shape stroke widths are not supported (the bounding boxes and occupancy masks are computed without it). Scanline data is stored as `RGBA32F` and the packed colors as `R32UI`, in textures 4096 texels wide.

This approach has been chosen over a "standard approach" primarily to avoid CPU-side triangulation, reduce memory usage (no need to store triangles), enable thick outlines (strokes), allow for high-quality anti-aliasing, and for legacy (TissUUmaps 3) reasons.

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

Standard approach (dismissed):

1. Triangulate shapes on the CPU, e.g. using [earcut](https://github.com/mapbox/earcut)
   - If necessary, only triangulate visible shapes --> quadtree?
   - If necessary, only re-triangulate when necessary (e.g. drawing)
2. Transfer triangle coordinates into a flat element array buffer on the GPU (cf. points rendering)
3. Call `gl.drawElements()` with `gl.TRIANGLES` and `count = # triangles`
   - The vertex shader will run once for every vertex and output shape-specific (flat) varyings such as `v_color`
   - The fragment shader will run once for every triangle fragment (i.e., overdraw will result in several runs for the same pixel)

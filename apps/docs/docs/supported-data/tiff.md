---
sidebar_position: 2
---

# TIFF

Reads OME-TIFF, QPTIFF and plain pyramidal TIFF files, from a URL (`url`) or
from the open workspace (`path`). Tiles are decoded in the browser with
geotiff.js, so remote files need a server that supports HTTP range requests.
JPEG 2000 is not supported. Files without a pyramid open too, but slowly.

## Channels

Multi-channel files open as multi-channel images, with the channel names and
colors from the file and estimated contrast limits.

- **OME-TIFF**: the OME-XML describes the channels. `z` and `t` select the
  plane (default `0`). Pyramid levels are read from SubIFDs. Files with
  several images show the largest one.
- **QPTIFF**: each IFD has an XML description with the channel name and color.
  Thumbnail, overview and label images are skipped.
- **Plain TIFF**: the largest IFDs are the channels, smaller IFDs with the same
  aspect ratio are the pyramid levels. SubIFDs are used when present.

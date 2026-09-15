---
sidebar_position: 2
---

# TIFF

The built-in **TIFF data provider** opens OME-TIFF, QPTIFF and plain pyramidal TIFF files as **images**. Tiles are decoded in the browser with [geotiff.js](https://geotiffjs.github.io/), so no server-side tiling is needed; remote files need a server that supports HTTP range requests.

## Data source

TIFF data sources have the `type` `"tiff"` and accept the following fields:

| Field  | Type      | Description                                                                                                                 |
| ------ | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| `type` | `string`  | Always `"tiff"`.                                                                                                            |
| `url`  | `string`  | URL of a remote TIFF file, absolute or relative (see [Referencing data](../concepts/projects.md#referencing-data)).         |
| `path` | `string`  | Path of a TIFF file relative to the workspace directory (see [Referencing data](../concepts/projects.md#referencing-data)). |
| `z`    | `integer` | Z-plane to open (0-based), for OME-TIFF files with a z-stack. Defaults to `0`.                                              |
| `t`    | `integer` | Time point to open (0-based), for OME-TIFF files with a time series. Defaults to `0`.                                       |

Either `url` or `path` has to be given. When a workspace is open and both are given, `path` takes precedence.

## Images

The format is recognized from the file's metadata:

- **OME-TIFF**: the OME-XML describes the channels. `z` and `t` select the plane. Pyramid levels are read from SubIFDs. Files with several images show the largest one.
- **QPTIFF**: each IFD has an XML description with the channel name and color. Thumbnail, overview and label images are skipped.
- **Plain TIFF**: the largest IFDs are the channels, smaller IFDs with the same aspect ratio are the pyramid levels. SubIFDs are used when present.

Files without a pyramid open too, but slowly.

### Channels

Multi-channel files are opened as **value images**: tiles carry the raw samples of the file, which are contrast-stretched and colorized at display time. TissUUmaps renders every channel itself, stretching it between its contrast limits, multiplying it with its color, and blending the channels additively. RGB files are drawn as they are.

Per-channel rendering settings come from the file where it records them:

| Setting         | Source                                    | Fallback                                                                                                   |
| --------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Name            | OME-XML `Channel` `Name`, QPTIFF `Name`   | none                                                                                                       |
| Color           | OME-XML `Channel` `Color`, QPTIFF `Color` | a color derived from the channel index                                                                     |
| Contrast limits | not recorded by TIFF                      | the full range for integers of 8 bits or fewer, otherwise the 1% and 99.9% quantiles of a sample of pixels |
| Visibility      | not recorded by TIFF                      | visible                                                                                                    |

All of these can be overridden per channel in the project file through the image's `channels` array (see the [example](#example) below).

## Example

A project showing a multiplexed OME-TIFF next to the project file, opening the fifth z-plane and overriding two channels:

```json title="project.tmap"
{
  "name": "TIFF example",
  "layers": [{ "id": "layer", "name": "Sample" }],
  "images": [
    {
      "id": "image",
      "name": "Multiplexed image",
      "layer": "layer",
      "dataSource": {
        "type": "tiff",
        "url": "images/sample.ome.tif",
        "z": 4
      },
      "channels": [
        { "name": "DAPI", "color": { "r": 0, "g": 0, "b": 255 } },
        { "name": "CD3", "contrastLimits": [100, 4000] },
        { "visibility": false }
      ]
    }
  ]
}
```

Channel settings that are left out fall back to the file's metadata and to the estimated contrast limits.

## Limitations

- Only one plane (`z`, `t`) of an OME-TIFF is shown; there is no in-app plane selection yet.
- JPEG 2000 compression is not supported.
- Multi-file OME-TIFF is not supported; the planes have to be in the file that is opened.
- `path` needs an open workspace.
- Palette and white-is-zero images are rejected.

## API

The data provider is implemented in the [`@tissuumaps/storage`](/docs/api/@tissuumaps/storage) package as [`TIFFImageDataProvider`](/docs/api/@tissuumaps/storage/classes/TIFFImageDataProvider). Reading the file is delegated to [geotiff.js](https://geotiffjs.github.io/), and tiling to our fork of [GeoTIFFTileSource](https://github.com/TissUUmaps/GeoTIFFTileSource) (see [Dependencies](../development/dependencies.md)).

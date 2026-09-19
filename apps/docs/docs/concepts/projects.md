---
sidebar_position: 1
---

# Projects

A **TissUUmaps project** consists of all data objects and viewer configuration used by a single TissUUmaps instance. When stored on disk or in the cloud, a TissUUmaps project consists of a _TissUUmaps project file_ and the corresponding data of various types.

The **TissUUmaps project file** (in JSON format, file name ending with `.tmap`) describes how data objects spatially relate to each other and how they are displayed in the TissUUmaps application. Project files do not hold any data directly; instead, they describe "data sources" that reference separately stored data of various types and formats.

The TissUUmaps project file and corresponding data may be stored locally (client-side) or hosted remotely (server-side; together with the TissUUmaps application or elsewhere).

## Referencing data

Data sources reference their data by a single `source` string, which is one of the following:

- A **URL** with a scheme (e.g. `https://example.org/data/he.dzi`) refers to remote data and is used as is.
- An **app-relative path**, prefixed with `//` (e.g. `//data/he.dzi`), is resolved against the URL of the TissUUmaps application.
- A **workspace-relative path**, prefixed with `/` (e.g. `/data/he.dzi`), refers to local data within the **TissUUmaps workspace directory** the user has opened. Without an open workspace, it falls back to being app-relative.
- A **project-relative path**, without prefix (e.g. `images/he.dzi`, `./images/he.dzi` or `../shared/he.dzi`), is resolved **against where the project file itself was loaded from**: a project served at `https://example.org/studies/liver/project.tmap` resolves `images/he.dzi` to `https://example.org/studies/liver/images/he.dzi`, and a project opened from a workspace resolves it within the project file's directory. This lets a project directory be moved or copied to another host or workspace without touching the project file.

  Projects that were loaded from neither - those opened from a local file through the project panel - have no such base. Their project-relative paths fall back to being workspace-relative, and thus, without an open workspace, to being app-relative.

Paths use `/` as separator and may contain `.` and `..` segments. A path cannot leave the workspace; against a project URL, `..` segments that would lead above the root of the URL's path are dropped, as in any URL. A project-relative path whose first segment contains a colon (e.g. `sample1:ch2.tif`) would be taken for a URL with the scheme `sample1:`; write it as `./sample1:ch2.tif` instead. For consistency, it is recommended to store the TissUUmaps project file in the root of the workspace. Conventionally, locally stored TissUUmaps projects are named `project.tmap`, and the TissUUmaps workspace directory name is used to identify the project.

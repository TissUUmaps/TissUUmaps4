---
sidebar_position: 1
---

# Projects

A **TissUUmaps project** consists of all data objects and viewer configuration used by a single TissUUmaps instance. When stored on disk or in the cloud, a TissUUmaps project consists of a _TissUUmaps project file_ and the corresponding data of various types.

The **TissUUmaps project file** (in JSON format, file name ending with `.tmap`) describes how data objects spatially relate to each other and how they are displayed in the TissUUmaps application. Project files do not hold any data directly; instead, they describe "data sources" that reference separately stored data of various types and formats.

The TissUUmaps project file and corresponding data may be stored locally (client-side) or hosted remotely (server-side; together with the TissUUmaps application or elsewhere).

## Referencing data

Data sources reference their data either by `path` or by `url`:

- A **`path`** refers to local data, and is always relative to the **TissUUmaps workspace directory** the user has opened. For consistency, it is recommended to store the TissUUmaps project file in the root of that workspace. Conventionally, locally stored TissUUmaps projects are named `project.tmap`, and the TissUUmaps workspace directory name is used to identify the project.
- A **`url`** refers to remote data, and may be absolute or relative. A relative URL is resolved **against the URL the project file itself was loaded from** - so a project served at `https://example.org/studies/liver/project.tmap` resolves `images/he.dzi` to `https://example.org/studies/liver/images/he.dzi`. This lets a project directory be moved or copied to another host without touching the project file.

  Projects that were not loaded from a URL - those opened from a local file through the project panel - have no such base. Their relative URLs are resolved against the TissUUmaps application root instead.

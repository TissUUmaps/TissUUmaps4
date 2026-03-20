---
sidebar_position: 1
---

# Projects

A **TissUUmaps project** consists of all data objects and viewer configuration used by a single TissUUmaps instance. When stored on disk or in the cloud, a TissUUmaps project consists of a TissUUmaps project file (in JSON format, ending with `.tmap`) and the corresponding data of various types (in one of the supported formats).

The **TissUUmaps project file** describes how data objects spatially relate to each other and how they are displayed in the TissUUmaps application. Project files do not hold any data directly; instead, they describe "data sources" that reference separately stored data of various types and formats.

The TissUUmaps project file and corresponding data may be stored locally (client-side) or hosted remotely (server-side; together with the TissUUmaps application or elsewhere). When referencing local data, file paths relative to the **TissUUmaps workspace directory** must be used. For consistency, it is recommended to store the TissUUmaps project file in the root of the TissUUmaps workspace in this case. Conventionally, locally stored TissUUmaps projects are named `project.tmap`, and the TissUUmaps workspace directory name is used to identify the project.

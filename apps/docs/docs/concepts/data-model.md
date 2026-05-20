---
sidebar_position: 3
---

# Data model

A single **_Project_** can hold multiple rendered data objects (**_Images_**, **_Labels_**, **_Points_**, **_Shapes_**).

Each rendered data object can be shown on one or more **_Layers_**; a single item (e.g. point, shape) is never shown on more than one layer.

Rendered data objects representing multi-item data (_Labels_, _Points_, _Shapes_) can link to **_Table_** columns for item configuration.

The following simplified class diagram outlines this conceptual model, ignoring any functions/methods and inheritance structures.

```mermaid
---
title: Simplified class diagram
---

classDiagram
    class Project
    Project : name
    Project : marker/size/color/visibility/opacity maps
    Project : OpenSeadragon viewer options, WebGL render options
    Project "1" *--> "0..*" Layer : layers
    Project "1" *--> "0..*" Image : images
    Project "1" *--> "0..*" Labels : labels
    Project "1" *--> "0..*" Points : points
    Project "1" *--> "0..*" Shapes : shapes
    Project "1" *--> "0..*" Table : tables

    class Layer
    Layer : id
    Layer : name
    Layer : layer-to-world transform
    Layer : visibility, opacity, point size factor

    class Image
    Image : id
    Image : name
    Image : data source
    Image : visibility, opacity
    Image : data-to-layer transform
    Image "0..*" --> "1" Layer

    class Labels
    Labels : id
    Labels : name
    Labels : data source
    Labels : visibility, opacity
    Labels : data-to-layer transform
    Labels : label color/visibility/opacity
    Labels "0..*" --> "1" Layer
    Labels "0..*" ..> "1" Table

    class Points
    Points : id
    Points : name
    Points : data source
    Points : visibility, opacity
    Points : data-to-layer transform
    Points : point marker/size/color/visibility/opacity
    Points "0..*" --> "0..*" Layer
    Points "0..*" ..> "1" Table

    class Shapes
    Shapes : id
    Shapes : name
    Shapes : data source
    Shapes : visibility, opacity
    Shapes : data-to-layer transform
    Shapes : shape fill color/visibility/opacity
    Shapes : shape stroke color/visibility/opacity
    Shapes "0..*" --> "0..*" Layer
    Shapes "0..*" ..> "1" Table

    class Table
    Table : id
    Table : name
    Table : data source
```

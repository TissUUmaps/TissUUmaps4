---
sidebar_position: 3
---

# Data model

A single **_Project_** can hold multiple rendered data objects (**_Images_**, **_Labels_**, **_Points_**, **_Shapes_**).

Each rendered data object can be shown on zero or more **_Layers_**, as configured by corresponding layer configurations.

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
    Image "0..*" --> "0..*" Layer : layer configurations (incl. data-to-layer transforms)

    class Labels
    Labels : id
    Labels : name
    Labels : data source
    Labels : visibility, opacity
    Labels : label color/visibility/opacity
    Labels "0..*" --> "0..*" Layer : layer configurations (incl. data-to-layer transforms)
    Labels "0..*" ..> "1" Table

    class Points
    Points : id
    Points : name
    Points : data source
    Points : visibility, opacity
    Points : point marker/size/color/visibility/opacity
    Points "0..*" --> "0..*" Layer : layer configurations (incl. data-to-layer transforms)
    Points "0..*" ..> "1" Table

    class Shapes
    Shapes : id
    Shapes : name
    Shapes : data source
    Shapes : visibility, opacity
    Shapes : shape fill color/visibility/opacity
    Shapes : shape stroke color/visibility/opacity
    Shapes "0..*" --> "0..*" Layer : layer configurations (incl. data-to-layer transforms)
    Shapes "0..*" ..> "1" Table

    class Table
    Table : id
    Table : name
    Table : data source
```

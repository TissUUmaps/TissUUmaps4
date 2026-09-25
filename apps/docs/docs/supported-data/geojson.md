---
sidebar_position: 5
---

# GeoJSON

## Feature IDs

The `idProperty` names the feature property holding the shape IDs, which are taken as JSON types them: integers stay integers, and strings stay strings, so a table annotating the shapes has to key its rows the same way. Without an `idProperty`, shapes are keyed by their position in the file.

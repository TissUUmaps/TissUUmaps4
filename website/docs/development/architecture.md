---
sidebar_position: 1
---

# Architecture

This project follows best practices for React projects (components, state management, hooks, etc).

User and developer documentation is hosted in the same repository ("monorepo").

## Model

Models are implemented using a factory pattern. For each `Model` there exists a derived `CompleteModel` type in which optional fields are replaced by required fields holding `DEFAULT_VALUES`. A corresponding `completeModel()` function can be used to convert a `Model` into a `CompleteModel`.

Most data model properties can be either a single constant (e.g. a single color uniformly applied to all elements), a reference to a table column holding a value (e.g. a continuous value that is mapped to a color using a color palette) for each element, or a reference to a table column holding a group name for each element, where each group (e.g. cell type) maps to a single value (e.g. color, using a colormap).

## Data layer

Data loaders (e.g. a specific table data loader) offer functionality for loading data objects (e.g. a table instance), which can in turn be used to load parts of the required data (e.g. a specific table column). They have a unique `type` and need to be registered in the application state before attempting to load data of that type. All data loader and data object functions starting with `load...` are asynchronous.

## State management

A single Zustand store is being used, which is distributed over several slices. The main slices are `appSlice` (transient application state), `projectSlice` (persistent project information) and data type-specific slices that hold project data (transient in-memory data and persistent metadata).

## React components

Components are grouped in barrels. In most cases, calls to React hooks are abstracted into custom hooks.

## Utilities

Utilities are exclusively implemented as static classes with corresponding unit tests.

---
sidebar_position: 5
---

# Dependencies

## Development stack

- pnpm
- Vite
- TypeScript
- ESLint (linting)
- Prettier + import-sort plugin (formatting)
- Vitest + jsdom + node-canvas (testing with coverage)
- API Extractor + unplugin-dts (type declaration rollups for packages)
- vite-plugin-singlefile (single-file production build of the application)
- Docusaurus + TypeDoc + GitHub Pages (documentation)
- Husky + lint-staged (pre-commit hooks)
- GitHub Actions (CI/CD)

## Core dependencies

- React (frontend library)
- Zustand + Immer (state management with immutable updates)
- Tailwind CSS (CSS framework)
- Dockview (docking layout manager)
- Base UI (headless component library) with shadcn/ui-generated wrappers vendored into `components/ui` (`components.json`) + Lucide (icon component library)
- OpenSeadragon (zoomable image and labels rendering)
- JSON Forms (JSON Schema-based form renderer)
- TanStack Table + TanStack Virtual (virtualized data tables)
- react-colorful (color picker)

## Data loading

- Hyparquet + hyparquet-compressors (Parquet tables; bundled into the Parquet worker)
- PapaParse (CSV tables)
- omezarr-tilesource (OME-Zarr images)

## Utilities

- dnd-kit (drag and drop interfaces)
- fast-equals (equality comparison)
- gl-matrix (WebGL matrix operations)
- class-variance-authority + clsx + tailwind-merge (class name composition)

## Web APIs (selection)

- File System (local data access)
- Web Workers (Parquet/GeoJSON parsing)
- WebGL 2 (points and shapes rendering)

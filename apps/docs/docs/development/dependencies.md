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
- geotiff.js + geotiff-tilesource (TIFF images, see below)

## Utilities

- dnd-kit (drag and drop interfaces)
- fast-equals (equality comparison)
- gl-matrix (WebGL matrix operations)
- class-variance-authority + clsx + tailwind-merge (class name composition)

## Patched dependencies

Patches live in `patches/` and are applied by pnpm. Drop each once upstream
ships the fix.

- **geotiff 3.0.5**: the LZW dictionary is one code short
  ([#546](https://github.com/geotiffjs/geotiff.js/pull/546)), and deferred tag
  arrays are read with the wrong byte order
  ([#536](https://github.com/geotiffjs/geotiff.js/pull/536)). Tiles are
  decoded in our own worker (`tiff.worker.ts`) so that it uses the patched
  code too.

## Forked dependencies

- **geotiff-tilesource**: our fork of pearcetm/GeoTIFFTileSource, branch
  `tissuumaps` of
  [TissUUmaps/GeoTIFFTileSource](https://github.com/TissUUmaps/GeoTIFFTileSource).
  It carries six changes we need, each also submitted upstream. Drop the fork
  once they are released. The package has no types, so
  `geotiff-tilesource.d.ts` declares what we use.

The commit is pinned in `package.json`. To move it, change the hash there and
run `pnpm install`.

## Web APIs (selection)

- File System (local data access)
- Web Workers (Parquet/GeoJSON parsing)
- WebGL 2 (points and shapes rendering)

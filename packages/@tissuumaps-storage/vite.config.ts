/// <reference types="vitest/config" />
import { resolve } from "node:path";
import dts from "unplugin-dts/vite";
import {
  defaultClientConditions,
  defaultServerConditions,
  defineConfig,
} from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    dts({
      bundleTypes: true,
      tsconfigPath: resolve(import.meta.dirname, "tsconfig.ts59.json"),
    }),
  ],
  worker: {
    format: "es",
  },
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, "src/index.ts"),
        csv: resolve(import.meta.dirname, "src/csv/index.ts"),
        geojson: resolve(import.meta.dirname, "src/geojson/index.ts"),
        "ome-zarr": resolve(import.meta.dirname, "src/ome-zarr/index.ts"),
        openseadragon: resolve(
          import.meta.dirname,
          "src/openseadragon/index.ts",
        ),
        parquet: resolve(import.meta.dirname, "src/parquet/index.ts"),
        table: resolve(import.meta.dirname, "src/table/index.ts"),
      },
      formats: ["es"],
    },
    // Worker-only deps (hyparquet, hyparquet-compressors) are intentionally NOT
    // externalized: the workers are imported with `?worker&inline`, so they must
    // be self-contained and their deps get bundled into the inline worker. Also,
    // openseadragon is not externalized, because nothing imports it.
    rolldownOptions: {
      external: ["@tissuumaps/core", "omezarr-tilesource", "papaparse"],
      checks: {
        pluginTimings: false,
      },
    },
  },
  test: {
    include: ["./src/**/*.test.js", "./src/**/*.test.ts"],
    typecheck: {
      tsconfig: resolve(import.meta.dirname, "tsconfig.test.json"),
    },
  },
  resolve: {
    conditions:
      mode === "production"
        ? [...defaultClientConditions]
        : ["tissuumaps-development", ...defaultClientConditions],
  },
  ssr: {
    resolve: {
      conditions:
        mode === "production"
          ? [...defaultServerConditions]
          : ["tissuumaps-development", ...defaultServerConditions],
    },
  },
}));

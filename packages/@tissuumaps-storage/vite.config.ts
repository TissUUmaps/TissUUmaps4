/// <reference types="vitest/config" />
import { resolve } from "node:path";
import dts from "unplugin-dts/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    dts({
      bundleTypes: true,
      tsconfigPath: resolve(__dirname, "tsconfig.ts59.json"),
    }),
  ],
  worker: {
    format: "es",
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        csv: resolve(__dirname, "src/csv/index.ts"),
        geojson: resolve(__dirname, "src/geojson/index.ts"),
        "ome-zarr": resolve(__dirname, "src/ome-zarr/index.ts"),
        openseadragon: resolve(__dirname, "src/openseadragon/index.ts"),
        parquet: resolve(__dirname, "src/parquet/index.ts"),
        table: resolve(__dirname, "src/table/index.ts"),
      },
      formats: ["es"],
    },
    // Worker-only deps (hyparquet, hyparquet-compressors) are intentionally not
    // externalized: the workers are imported with `?worker&inline`, so they must
    // be self-contained and their deps get bundled into the inline worker.
    rollupOptions: {
      external: ["@tissuumaps/core", "omezarr-tilesource", "papaparse"],
    },
  },
  test: {
    include: ["./src/**/*.test.js", "./src/**/*.test.ts"],
    typecheck: {
      tsconfig: resolve(__dirname, "tsconfig.test.json"),
    },
  },
});

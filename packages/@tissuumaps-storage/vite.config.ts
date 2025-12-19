/// <reference types="vitest/config" />
import { resolve } from "node:path";
import dts from "unplugin-dts/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    dts({
      bundleTypes: true,
      tsconfigPath: resolve(__dirname, "tsconfig.json"),
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        csv: resolve(__dirname, "src/csv/index.ts"),
        geojson: resolve(__dirname, "src/geojson/index.ts"),
        openseadragon: resolve(__dirname, "src/openseadragon/index.ts"),
        parquet: resolve(__dirname, "src/parquet/index.ts"),
        table: resolve(__dirname, "src/table/index.ts"),
      },
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["@tissuumaps/core"],
      output: {
        globals: {
          "@tissuumaps/core": "TissUUmapsCore",
        },
      },
    },
  },
  test: {
    include: ["./src/**/*.test.js", "./src/**/*.test.ts"],
    typecheck: {
      tsconfig: resolve(__dirname, "tsconfig.test.json"),
    },
  },
});

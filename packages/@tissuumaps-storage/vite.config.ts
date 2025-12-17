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
        "tissuumaps-storage": resolve(__dirname, "src/index.ts"),
        "tissuumaps-storage-csv": resolve(__dirname, "src/csv.ts"),
        "tissuumaps-storage-geojson": resolve(__dirname, "src/geojson.ts"),
        "tissuumaps-storage-openseadragon": resolve(
          __dirname,
          "src/openseadragon.ts",
        ),
        "tissuumaps-storage-parquet": resolve(__dirname, "src/parquet.ts"),
        "tissuumaps-storage-table": resolve(__dirname, "src/table.ts"),
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

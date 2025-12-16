/// <reference types="vitest/config" />
import { resolve } from "node:path";
import dts from "unplugin-dts/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    dts({
      bundleTypes: true,
      tsconfigPath: resolve(__dirname, "tsconfig.lib.json"),
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es", "umd"],
      fileName: "tissuumaps-core",
      name: "TissUUmapsCore", // UMD global name
    },
  },
  test: {
    include: ["src/**/*.test.js", "src/**/*.test.ts"],
    typecheck: {
      tsconfig: resolve(__dirname, "tsconfig.test.json"),
    },
  },
});

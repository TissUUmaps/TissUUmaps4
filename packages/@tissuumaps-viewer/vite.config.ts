/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
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
    react(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "@tissuumaps/core",
        "@tissuumaps/render",
      ],
    },
  },
  test: {
    include: [
      "./src/**/*.test.js",
      "./src/**/*.test.jsx",
      "./src/**/*.test.ts",
      "./src/**/*.test.tsx",
    ],
    typecheck: {
      tsconfig: resolve(__dirname, "tsconfig.test.json"),
    },
    environment: "jsdom",
  },
});

/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { type Plugin, type PluginOption, defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss() as Plugin[],
    viteSingleFile() as PluginOption,
  ],
  build: {
    chunkSizeWarningLimit: 2048,
  },
  test: {
    include: [
      "src/**/*.test.js",
      "src/**/*.test.jsx",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
    typecheck: {
      tsconfig: resolve(__dirname, "tsconfig.test.json"),
    },
  },
});

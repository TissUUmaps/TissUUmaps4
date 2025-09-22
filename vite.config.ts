/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { viteSingleFile } from "vite-plugin-singlefile";

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react(), tailwindcss(), nodePolyfills(), viteSingleFile()],
  test: {
    globals: true, // https://testing-library.com/docs/react-testing-library/setup#auto-cleanup-in-vitest
    environment: "jsdom",
  },
});

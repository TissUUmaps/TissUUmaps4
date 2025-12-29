import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/.docusaurus",
    "**/build",
    "**/coverage",
    "**/dist",
    "**/node_modules",
  ]),
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  // General
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: {
          defaultProject: "tsconfig.node.json",
          allowDefaultProject: [
            "eslint.config.js",
            "vitest.config.ts",
            "apps/*/vite.config.ts",
            "packages/*/vite.config.ts",
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Tests - apps/tissuumaps
  {
    files: ["apps/tissuumaps/src/**/*.test.{js,jsx,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./apps/tissuumaps/tsconfig.test.json",
      },
    },
  },
  // Tests - packages/@tissuumaps-core
  {
    files: ["packages/@tissuumaps-core/src/**/*.test.{js,ts}"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./packages/@tissuumaps-core/tsconfig.test.json",
      },
    },
  },
  // Tests - packages/@tissuumaps-storage
  {
    files: ["packages/@tissuumaps-storage/src/**/*.test.{js,ts}"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./packages/@tissuumaps-storage/tsconfig.test.json",
      },
    },
  },
  // Tests - packages/@tissuumaps-plugins
  {
    files: ["packages/@tissuumaps-plugins/src/**/*.test.{js,ts}"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./packages/@tissuumaps-plugins/tsconfig.test.json",
      },
    },
  },
  // Tests - packages/@tissuumaps-viewer
  {
    files: ["packages/@tissuumaps-viewer/src/**/*.test.{js,jsx,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./packages/@tissuumaps-viewer/tsconfig.test.json",
      },
    },
  },
  // React
  {
    files: [
      "apps/tissuumaps/**/*.{js,jsx,ts,tsx}",
      "packages/@tissuumaps-viewer/**/*.{js,jsx,ts,tsx}",
    ],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  },
  eslintConfigPrettier,
]);

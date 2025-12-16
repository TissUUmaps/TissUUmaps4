import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["**/coverage", "**/dist", "**/node_modules"]),
  //eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  // General
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      //eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      globals: globals.browser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.js", "*.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // React
  {
    files: [
      "apps/tissuumaps/**/*.{js,jsx,ts,tsx}",
      "packages/@tissuumaps-viewer/**/*.{js,jsx,ts,tsx}",
    ],
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    extends: [
      //eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      reactHooks.configs.flat.recommended,
      //eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      reactRefresh.configs.vite,
    ],
  },
  eslintConfigPrettier,
]);

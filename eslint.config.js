// @ts-check
import eslint from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import sonarjs from "eslint-plugin-sonarjs";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import svelteParser from "svelte-eslint-parser";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  sonarjs.configs.recommended,
  ...svelte.configs["flat/recommended"],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".svelte"],
      },
    },
  },
  {
    files: ["src/**/*.test.ts"],
    plugins: { vitest },
    rules: { ...vitest.configs.recommended.rules },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ["**/*.{js,ts,svelte}"],
    rules: {
      complexity: ["error", { max: 10 }],
      "sonarjs/cognitive-complexity": ["error", 15],
    },
  },
  {
    files: ["*.config.js", "*.config.ts", "eslint.config.js"],
    rules: {
      complexity: "off",
      "sonarjs/cognitive-complexity": "off",
    },
  },
  {
    files: ["**/*.svelte.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    ignores: [
      ".svelte-kit/**",
      "build/**",
      "node_modules/**",
      "src-tauri/target/**",
      "vite.config.js",
      "svelte.config.js",
    ],
  },
);

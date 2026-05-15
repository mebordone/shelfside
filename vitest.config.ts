import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  resolve: {
    conditions: ["browser", "import", "module", "default"],
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/vitest-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,svelte}"],
      exclude: [
        "src/**/*.test.ts",
        "src/test/**",
        "src/routes/+layout.ts",
        "**/.svelte-kit/**",
      ],
      thresholds: {
        lines: 60,
        statements: 60,
        branches: 55,
        functions: 45,
      },
    },
  },
});

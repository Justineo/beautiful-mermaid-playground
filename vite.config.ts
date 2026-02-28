import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import monacoPlugin from "@kong-ui-public/monaco-editor/vite-plugin";
import { SHIKI_MONACO_THEMES } from "./src/constants/monacoThemes";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    monacoPlugin({
      languages: [],
      features: [],
      shiki: {
        langs: ["mermaid"],
        // Keep plugin-side bundled themes aligned with runtime theme switching.
        themes: [...SHIKI_MONACO_THEMES],
      },
    }),
    vue(),
  ],
  build: {
    // Monaco + diagram runtime are intentionally split into dedicated async chunks.
    chunkSizeWarningLimit: 1500,
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Raise split threshold to reduce small fragmented chunks.
          minSize: 80_000,
          groups: [
            {
              name: "editor-monaco",
              // Keep Monaco core + tiny virtual bridge together for stable editor cacheability.
              test: /(node_modules[\\/]monaco-editor|virtual:monaco-editor|_virtual_monaco-editor)/,
              priority: 100,
            },
            {
              // Merge all Shiki theme modules into one chunk, independent from Shiki runtime.
              name: "editor-shiki-themes",
              test: /node_modules[\\/]@shikijs[\\/]themes/,
              priority: 98,
            },
            {
              // JavaScript regex engine for browsers with lookbehind support.
              name: "editor-shiki-engine-js",
              test: /node_modules[\\/](@shikijs[\\/]engine-javascript|oniguruma-to-es)/,
              priority: 97,
            },
            {
              // Oniguruma regex engine fallback for browsers without lookbehind support.
              name: "editor-shiki-engine-onig",
              test: /node_modules[\\/](@shikijs[\\/]engine-oniguruma|vscode-oniguruma|shiki[\\/]dist[\\/]engine-oniguruma)/,
              priority: 96,
            },
            {
              // Shiki runtime stays separate from theme payload.
              name: "editor-shiki-runtime",
              test: /(virtual:shiki|_virtual_shiki|node_modules[\\/](@shikijs(?![\\/]themes|[\\/]engine-javascript|[\\/]engine-oniguruma)|shiki(?![\\/]dist[\\/]engine-oniguruma)|shiki-codegen))/,
              priority: 94,
            },
            {
              // beautiful-mermaid currently statically imports elkjs, so they must stay together.
              name: "renderer-core",
              test: /node_modules[\\/](beautiful-mermaid|elkjs|entities)/,
              priority: 90,
            },
            {
              name: "ui-infra",
              test: /node_modules[\\/](@vueuse[\\/]core|overlayscrollbars)/,
              priority: 30,
            },
          ],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

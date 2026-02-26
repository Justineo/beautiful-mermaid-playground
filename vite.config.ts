import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import monacoPlugin from "@kong-ui-public/monaco-editor/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    monacoPlugin({
      languages: [],
      shiki: {
        langs: ["mermaid"],
        themes: ["one-light", "one-dark-pro"],
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
          minSize: 20_000,
          maxSize: 1_400_000,
          groups: [
            {
              name: "editor-monaco",
              test: /node_modules[\\/](monaco-editor|@shikijs|shiki)/,
              priority: 100,
            },
            {
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

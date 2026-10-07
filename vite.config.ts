import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA as vitePwa } from "vite-plugin-pwa";

export default defineConfig({
  // relative, so one build works at both a domain root and a project path
  base: "./",
  plugins: [
    tailwindcss(),
    svelte(),
    vitePwa({
      registerType: "autoUpdate",
      // public/manifest.webmanifest
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,txt,woff2,webmanifest}"],
        // the word list is a couple of megabytes
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  build: { target: "es2024" },
  worker: { format: "es" },
});

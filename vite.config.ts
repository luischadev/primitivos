import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import macros from "unplugin-parcel-macros";

export default defineConfig({
  plugins: [
    macros.vite(), // must be first — transforms S2 CSS macros at build time
    react(),
  ],
  build: {
    target: ["es2022"],
    cssMinify: "lightningcss",
    rollupOptions: {
      output: {
        // Bundle all S2 + style-macro CSS into one shared chunk to avoid
        // duplication across code-split routes.
        manualChunks(id) {
          if (
            /macro-(.*)\.css$/.test(id) ||
            /@react-spectrum\/s2\/.*\.css$/.test(id)
          ) {
            return "s2-styles";
          }
        },
      },
    },
  },
});

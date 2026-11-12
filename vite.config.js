import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" にしておくと、GitHub Pages でも Claude のアーティファクトでも
// 相対パスでそのまま動く
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    "process.env.IS_PREACT": JSON.stringify("false"),
  },
  build: {
    chunkSizeWarningLimit: 4000,
  },
});

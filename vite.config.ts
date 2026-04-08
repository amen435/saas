// E-School Link Vite Config v2
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const LOOPBACK_IN_URL = /localhost|127\.0\.0\.1|0\.0\.0\.0/i;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const onVercel = env.VERCEL === "1" || process.env.VERCEL === "1";
  const stripLoopback = (v: string) => (LOOPBACK_IN_URL.test(v) ? "" : v);
  // Never bake loopback URLs into any production bundle (Vercel, CI, or local `vite build`).
  const stripClientApiEnv = mode === "production" || onVercel;
  const viteApiUrl = stripClientApiEnv ? stripLoopback(env.VITE_API_URL || "") : env.VITE_API_URL || "";
  const viteApiBase = stripClientApiEnv
    ? stripLoopback(env.VITE_API_BASE_URL || "")
    : env.VITE_API_BASE_URL || "";

  return {
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify(viteApiUrl),
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify(viteApiBase),
  },
  server: {
    host: true,
    port: 8080,
    // Fail startup if 8080 is taken so the app URL and API proxy always match (avoids silent jump to another port while bookmarks still use :8080).
    strictPort: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
});

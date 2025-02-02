import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default ({ mode }) => {
  const isLocalhost = process.env.NODE_ENV === "development";
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  return defineConfig({
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            phaser: ["phaser"],
          },
        },
      },
    },
    plugins: [react()],
    server: {
      allowedHosts: ["client.willbowman.dev", "localhost"],
      port: 3003,
      proxy: {
        "/.proxy/assets": {
          target: "http://localhost:3003/assets",
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/.proxy\/assets/, ""),
        },
        "/.proxy/api": {
          target: "http://localhost:3004",
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path.replace(/^\/.proxy\/api/, ""),
        },
      },
      hmr: {
        clientPort: isLocalhost ? 3003 : 443,
      },
    },
  });
};

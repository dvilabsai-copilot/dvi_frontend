import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_API_DVI_BASE_URL || "http://127.0.0.1:4006";

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api": {
          target: apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      // Resolve aliases from the application tsconfig only. The workspace
      // also contains an incomplete deployment snapshot under
      // `.deploy-staging`; allowing the plugin to discover every tsconfig
      // below the workspace makes Vite parse those broken snapshots and can
      // leave dev-server module graphs in a bad state.
      tsconfigPaths({
        root: ".",
        projects: ["./tsconfig.json"],
      }),
      mode === "development" && componentTagger()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";

// Serves files in `api/` as Node handlers during `vite dev`, mirroring how
// Vercel runs them in production. Without this, fetch("/api/upload") 404s.
function vercelApiDev(): Plugin {
  return {
    name: "vercel-api-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        const pathname = req.url.split("?")[0]!.replace(/\/+$/, "");
        const rel = pathname.slice("/api/".length);
        if (!rel) return next();
        const handlerPath = path.resolve(__dirname, "api", `${rel}.ts`);
        try {
          const mod = await server.ssrLoadModule(handlerPath);
          await mod.default(req, res);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Make .env / .env.local vars (e.g. BLOB_READ_WRITE_TOKEN) visible to the
  // Node-side API handlers loaded by the vercel-api-dev plugin.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    plugins: [react(), TanStackRouterVite(), tailwindcss(), vercelApiDev()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

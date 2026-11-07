import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import type { IncomingMessage, ServerResponse } from "node:http";

function localEdgeApiPlugin(): Plugin {
  return {
    name: "energychoice-local-edge-api",
    configureServer(server) {
      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next) => {
          const urlPath = req.url?.split("?")[0];
          if (
            urlPath !== "/api/spark-match" &&
            urlPath !== "/api/execute-agreement" &&
            urlPath !== "/api/submit-loe"
          ) {
            return next();
          }

          try {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const rawBody = Buffer.concat(chunks).toString("utf-8");

            const webReq = new Request(`http://localhost${req.url}`, {
              method: req.method || "GET",
              headers: {
                "Content-Type":
                  (req.headers["content-type"] as string) || "application/json",
              },
              body:
                req.method && !["GET", "HEAD"].includes(req.method)
                  ? rawBody
                  : undefined,
            });

            const modPath =
              urlPath === "/api/spark-match"
                ? "/src/api/spark-match.ts"
                : urlPath === "/api/submit-loe"
                  ? "/src/api/submit-loe.ts"
                  : "/src/api/execute-agreement.ts";

            const mod = await server.ssrLoadModule(modPath);

            const webRes: Response = await mod.default(webReq);
            res.statusCode = webRes.status;
            webRes.headers.forEach((val, key) => res.setHeader(key, val));
            const text = await webRes.text();
            res.end(text);
          } catch (err: unknown) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: "Local Edge Middleware Error",
                details: err instanceof Error ? err.message : String(err),
              })
            );
          }
        }
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    plugins: [react(), tailwindcss(), localEdgeApiPlugin()],
    server: {
      port: 5173,
    },
  };
});

import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve as pathResolve, extname } from "node:path";
import { resolveDashboardBuild } from "./paths.js";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

interface ServerInstance {
  url: string;
  close: () => void;
}

/**
 * Start a static HTTP server for the dashboard.
 * Reads knowledge-graph.json from projectRoot/.understand-anything/
 * and serves the dashboard build as static files.
 */
export function startDashboardServer(projectRoot: string): Promise<ServerInstance> {
  return new Promise((resolve, reject) => {
    const buildDir = resolveDashboardBuild();
    const port = 0; // random available port

    const server = createServer((req, res) => {
      // Health check / knowledge graph API endpoint
      if (req.url === "/api/graph") {
        const graphPath = pathResolve(projectRoot, ".understand-anything", "knowledge-graph.json");
        if (!existsSync(graphPath)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "knowledge-graph.json not found. Run /understand first." }));
          return;
        }
        const graph = readFileSync(graphPath, "utf-8");
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(graph);
        return;
      }

      if (!req.url) {
        res.writeHead(400);
        res.end("Bad Request");
        return;
      }

      // Serve static files from the dashboard build
      let filePath = pathResolve(buildDir, req.url === "/" ? "index.html" : req.url.slice(1));

      // Security: ensure we don't serve outside the build directory
      if (!filePath.startsWith(buildDir)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      if (!existsSync(filePath)) {
        // SPA fallback: serve index.html for unknown paths
        filePath = pathResolve(buildDir, "index.html");
      }

      try {
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        const content = readFileSync(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
      } catch {
        res.writeHead(500);
        res.end("Internal Server Error");
      }
    });

    server.listen(port, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("Failed to get server address"));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        close: () => server.close(),
      });
    });

    server.on("error", reject);
  });
}

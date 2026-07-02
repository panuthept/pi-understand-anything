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

// ponytail: data-only files the dashboard fetches. Map them to project dir.
// Add if the dashboard gains new fetches.
const DATA_ROUTES = new Set([
  "knowledge-graph.json",
  "meta.json",
  "config.json",
  "diff-overlay.json",
  "domain-graph.json",
]);

/** Strip query string from a URL pathname. */
function cleanUrl(raw: string): string {
  const idx = raw.indexOf("?");
  return idx >= 0 ? raw.slice(0, idx) : raw;
}

/** Serve a JSON file from the project's /.understand-anything/ directory. */
function serveProjectFile(
  filename: string,
  projectRoot: string,
  res: import("node:http").ServerResponse,
) {
  const filePath = pathResolve(projectRoot, ".understand-anything", filename);
  if (!existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `${filename} not found. Run /understand first.` }));
    return;
  }
  const content = readFileSync(filePath, "utf-8");
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(content);
}

export interface ServerInstance {
  url: string;
  close: () => void;
}

/**
 * Start a static HTTP server for the dashboard.
 * Serves the dashboard build as static files.
 * Data files (knowledge-graph.json, meta.json, etc.) are served from
 * projectRoot/.understand-anything/ instead of the build directory.
 */
export function startDashboardServer(projectRoot: string): Promise<ServerInstance> {
  return new Promise((resolve, reject) => {
    const buildDir = resolveDashboardBuild();
    const port = 0; // random available port

    const server = createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end("Bad Request");
        return;
      }

      const pathname = cleanUrl(req.url);

      // ── Data routes: serve from project dir ──────────────────────
      if (pathname.startsWith("/")) {
        const filename = pathname.slice(1);
        if (DATA_ROUTES.has(filename)) {
          serveProjectFile(filename, projectRoot, res);
          return;
        }
      }

      // Backward compat alias
      if (pathname === "/api/graph") {
        serveProjectFile("knowledge-graph.json", projectRoot, res);
        return;
      }

      // ── Static files: serve from build dir ───────────────────────
      let filePath = pathResolve(buildDir, pathname === "/" ? "index.html" : pathname.slice(1));

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

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startDashboardServer, type ServerInstance } from "./src/serve-dashboard.js";
import { resolveDashboardBuild } from "./src/paths.js";

// ponytail: single server, global. Multiple servers later if concurrent sessions need it.
let currentServer: ServerInstance | null = null;

export default function (pi: ExtensionAPI) {
  const extRoot = fileURLToPath(new URL(".", import.meta.url));

  // ── Resource discovery: register skills ──────────────────────────
  pi.on("resources_discover", async (_event, _ctx) => {
    return {
      skillPaths: [
        resolve(extRoot, "skills", "understand"),
        resolve(extRoot, "skills", "understand-dashboard"),
        resolve(extRoot, "skills", "understand-knowledge"),
        resolve(extRoot, "skills", "understand-explain"),
        resolve(extRoot, "skills", "understand-diff"),
        resolve(extRoot, "skills", "understand-onboard"),
      ],
    };
  });

  // /understand is registered as a prompt template (prompts/understand.md)
  // via the pi.prompts field in package.json — no input event handler needed.

  // ── Auto-update: detect git commit/merge/rebase in bash tool results ────
  pi.on("tool_result", async (event, ctx) => {
    // Only care about bash tool results
    if (event.toolName !== "bash") return;
    // Check if the command was a git commit, merge, cherry-pick, or rebase
    if (!/git\s+(commit|merge|cherry-pick|rebase)/.test((event.input as any).command ?? "")) return;

    const cwd = ctx.cwd;
    const configPath = resolve(cwd, ".understand-anything", "config.json");
    const graphPath = resolve(cwd, ".understand-anything", "knowledge-graph.json");

    // Bail if auto-update isn't enabled or no graph exists yet
    let config: any;
    try {
      if (!existsSync(configPath) || !existsSync(graphPath)) return;
      config = JSON.parse(readFileSync(configPath, "utf-8"));
    } catch { return; }
    if (!config.autoUpdate) return;

    // Trigger the agent to run the auto-update flow
    pi.sendUserMessage(
      `[understand-anything] Git commit detected with auto-update enabled. ` +
      `Incrementally update the knowledge graph — read the instructions at ` +
      `${resolve(extRoot, "hooks", "auto-update-prompt.md")} ` +
      `and follow them. Do not ask the user for confirmation — just do it.`,
      { deliverAs: "steer" },
    );
  });

  // ── Session start: warn if knowledge graph is stale ───────────────────
  pi.on("session_start", async (event, ctx) => {
    if (event.reason !== "startup" && event.reason !== "reload") return;

    const cwd = ctx.cwd;
    const configPath = resolve(cwd, ".understand-anything", "config.json");
    const metaPath = resolve(cwd, ".understand-anything", "meta.json");
    const graphPath = resolve(cwd, ".understand-anything", "knowledge-graph.json");

    let config: any, meta: any;
    try {
      if (!existsSync(configPath) || !existsSync(metaPath) || !existsSync(graphPath)) return;
      config = JSON.parse(readFileSync(configPath, "utf-8"));
      meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    } catch { return; }
    if (!config.autoUpdate) return;

    try {
      const { stdout } = await pi.exec("git", ["rev-parse", "HEAD"], { cwd });
      const hash = stdout.trim();
      if (meta.gitCommitHash !== hash) {
        ctx.ui.setStatus("understand-anything", "Graph stale — /understand to update");
      }
    } catch {
      // Not a git repo or git unavailable — ignore
    }
  });

  // ── /understand-dashboard command ──────────────────────────────────────
  pi.registerCommand("understand-dashboard", {
    description: "Launch the interactive web dashboard to visualize a codebase's knowledge graph",
    handler: async (args, ctx) => {
      const projectRoot = args?.trim() ? resolve(process.cwd(), args.trim()) : process.cwd();
      const graphPath = resolve(projectRoot, ".understand-anything", "knowledge-graph.json");

      if (!existsSync(graphPath)) {
        ctx.ui.notify("No knowledge graph found. Run /understand first to analyze this project.", "error");
        return;
      }

      const dashboardBuild = resolveDashboardBuild();
      if (!existsSync(resolve(dashboardBuild, "index.html"))) {
        ctx.ui.notify("Dashboard build not found. The Understand-Anything dashboard may not be built yet.", "error");
        return;
      }

      try {
        if (currentServer) {
          ctx.ui.notify("Dashboard already running. Stop it first with /understand-dashboard-stop.", "warning");
          return;
        }
        const server = await startDashboardServer(projectRoot);
        currentServer = server;
        // ponytail: static token, server doesn't validate it. Rotate if token gate ever becomes real auth.
        const tokenizedUrl = `${server.url}?token=understand-anything`;
        ctx.ui.notify(`Dashboard running at ${tokenizedUrl}`, "info");
      } catch (err) {
        ctx.ui.notify(`Failed to start dashboard: ${err}`, "error");
      }
    },
  });

  // ── /understand-dashboard-stop command ───────────────────────────
  pi.registerCommand("understand-dashboard-stop", {
    description: "Stop the interactive web dashboard",
    handler: async (_args, ctx) => {
      if (!currentServer) {
        ctx.ui.notify("No dashboard is currently running.", "info");
        return;
      }
      currentServer.close();
      currentServer = null;
      ctx.ui.notify("Dashboard stopped.", "info");
    },
  });

  // /understand-knowledge, /understand-explain, /understand-diff, /understand-onboard
  // are registered as prompt templates (prompts/). Extension commands would shadow them,
  // so no command registration here — they fall through to template expansion.
}
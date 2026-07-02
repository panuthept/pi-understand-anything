import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startDashboardServer } from "./src/serve-dashboard.js";
import { resolveDashboardBuild } from "./src/paths.js";

export default function (pi: ExtensionAPI) {

  // ── Resource discovery: register skills ──────────────────────────
  pi.on("resources_discover", async (_event, _ctx) => {
    const extRoot = fileURLToPath(new URL(".", import.meta.url));
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

  // ── /understand-dashboard command ─────────────────────────────────
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
        const server = await startDashboardServer(projectRoot);
        ctx.ui.notify(`Dashboard running at ${server.url}`, "info");
      } catch (err) {
        ctx.ui.notify(`Failed to start dashboard: ${err}`, "error");
      }
    },
  });

  // ── /understand-knowledge command ─────────────────────────────────
  pi.registerCommand("understand-knowledge", {
    description: "Analyze a Karpathy-pattern LLM wiki knowledge base and generate an interactive knowledge graph",
    handler: async (args, ctx) => {
      ctx.ui.notify("Running /understand-knowledge — following the skill instructions.", "info");
    },
  });

  // ── /understand-explain command ───────────────────────────────────
  pi.registerCommand("understand-explain", {
    description: "Provide a thorough, in-depth explanation of a specific code component from the knowledge graph",
    handler: async (args, ctx) => {
      ctx.ui.notify("Running /understand-explain — following the skill instructions.", "info");
    },
  });

  // ── /understand-diff command ──────────────────────────────────────
  pi.registerCommand("understand-diff", {
    description: "Analyze git diffs or pull requests against the knowledge graph to understand what changed",
    handler: async (args, ctx) => {
      ctx.ui.notify("Running /understand-diff — following the skill instructions.", "info");
    },
  });

  // ── /understand-onboard command ───────────────────────────────────
  pi.registerCommand("understand-onboard", {
    description: "Generate an onboarding guide for new team members from the project's knowledge graph",
    handler: async (args, ctx) => {
      ctx.ui.notify("Running /understand-onboard — following the skill instructions.", "info");
    },
  });
}
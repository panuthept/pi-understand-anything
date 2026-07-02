---
name: understand-dashboard
description: Launch the interactive web dashboard to visualize a codebase's knowledge graph
argument-hint: [project-path]
---

# /understand-dashboard

Start the Understand Anything dashboard to visualize the knowledge graph for the current project.

## Instructions

1. Determine the project directory:
   - If `$ARGUMENTS` contains a path, use that as the project directory
   - Otherwise, use the current working directory

2. Check that `.understand-anything/knowledge-graph.json` exists in the project directory. If not, tell the user:
   ```
   No knowledge graph found. Run /understand first to analyze this project.
   ```

3. Find the dashboard code. The dashboard is at `packages/dashboard/` relative to this plugin's root directory. Check these paths in order and use the first that exists:
   - `${CLAUDE_PLUGIN_ROOT}/packages/dashboard/` (Claude Code runtime root, highest priority)
   - `~/.understand-anything-plugin/packages/dashboard/` (universal symlink, all installs)
   - Two levels up from `~/.agents/skills/understand-dashboard` real path (self-relative fallback)
   - Two levels up from `~/.copilot/skills/understand-dashboard` real path (Copilot personal skills fallback)
   - Common clone-based install roots:
     - `~/.codex/understand-anything/understand-anything-plugin/packages/dashboard/`
     - `~/.opencode/understand-anything/understand-anything-plugin/packages/dashboard/`
     - `~/.pi/understand-anything/understand-anything-plugin/packages/dashboard/`
     - `~/understand-anything/understand-anything-plugin/packages/dashboard/`

   This extension ships a pre-built dashboard at `dashboard-dist/`. Use the `/understand-dashboard` extension command to launch it — it resolves the build path automatically.

   If you need the source (Vite dev server), resolve the extension root:
   ```bash
   SKILL_REAL=$(realpath ~/.pi/agent/extensions/pi-understand-anything/skills/understand-dashboard 2>/dev/null || echo "")
   PLUGIN_ROOT=$([ -n "$SKILL_REAL" ] && cd "$SKILL_REAL/../.." 2>/dev/null && pwd || echo "")

   if [ -z "$PLUGIN_ROOT" ]; then
     echo "Error: Cannot find the pi-understand-anything extension root."
     exit 1
   fi

   DASHBOARD_DIR="$PLUGIN_ROOT/dashboard-dist"
   if [ ! -d "$DASHBOARD_DIR" ]; then
     echo "Error: dashboard-dist/ not found at $DASHBOARD_DIR"
     exit 1
   fi
   ```

4. The pre-built dashboard is at `dashboard-dist/`. Use the `/understand-dashboard` extension command to serve it as static files (no Vite needed).

   If you need the Vite dev server (e.g. for development), you'll need the Understand-Anything source repository.

5. Start the pre-built dashboard server via the extension command:
   ```bash
   # The /understand-dashboard command handles this automatically
   ```
   Or serve the static files directly:
   ```bash
   cd $PLUGIN_ROOT && npx serve dashboard-dist
   ```
   Run this in the background so the user can continue working.

6. **Capture the access token URL from the server output.** The Vite server prints a line like:
   ```
   🔑  Dashboard URL: http://127.0.0.1:<PORT>?token=<TOKEN>
   ```
   Extract the full URL including the `?token=` parameter. The token is required to access the knowledge graph data — without it the dashboard will show an "Access Token Required" gate.

7. Report to the user, including the full tokenized URL:
   ```
   Dashboard started at http://127.0.0.1:<PORT>?token=<TOKEN>
   Viewing: <project-dir>/.understand-anything/knowledge-graph.json

   The dashboard is running in the background. Press Ctrl+C in the terminal to stop it.
   ```
   **Important:** Always include the `?token=` parameter in the URL you share. If you omit it, the user will be blocked by the token gate and have to manually find the token in the terminal output.

## Notes

- The dashboard auto-opens in the default browser via `--open`
- If port 5173 is already in use, Vite will pick the next available port
- The `GRAPH_DIR` environment variable tells the dashboard where to find the knowledge graph

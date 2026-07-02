# pi-understand-anything: Pi Extension for Codebase Understanding

**Date:** 2026-07-02
**Status:** Spec

## Problem

Understand-Anything is a Claude Code plugin that produces interactive knowledge
graphs for codebase understanding — but it doesn't work with pi. Pi has its own
extension system, skill system, and subagent mechanism (pi-subagents). Porting
Understand-Anything to pi makes codebase understanding available to pi users.

## Solution

A `pi-understand-anything` extension that wraps the existing Understand-Anything
core packages (`@understand-anything/core`, `@understand-anything/skill`,
`@understand-anything/dashboard`) in pi's extension system. The extension:
- Registers `/understand`, `/understand-dashboard`, `/understand-explain`,
  `/understand-diff`, and `/understand-onboard` as pi commands
- Registers ported skills for each command via `resources_discover`
- Adapts agent `.md` files for pi-subagents' custom agent format
- Reuses the existing React dashboard as a static build served by a Node server

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  pi (core)                                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │  pi-subagents (Agent tool for sub-agent dispatch)  │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  pi-understand-anything extension                  │  │
│  │  index.ts → registerCommand, resources_discover    │  │
│  │  skills/  → SKILL.md files for each command        │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  @understand-anything/core (tree-sitter, graph)    │  │
│  │  @understand-anything/skill (context builders)     │  │
│  │  @understand-anything/dashboard (React static)     │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Extension Structure

```
~/.pi/agent/extensions/pi-understand-anything/
├── package.json              # pi extension metadata, depends on UA core packages
├── index.ts                  # Entry point — registers commands & resources
├── src/
│   ├── serve-dashboard.ts    # Static file server for the dashboard
│   └── paths.ts              # Path resolution helpers
├── agents/                   # Agent .md files adapted for pi-subagents
│   ├── project-scanner.md
│   ├── file-analyzer.md
│   ├── architecture-analyzer.md
│   ├── domain-analyzer.md
│   ├── tour-builder.md
│   ├── graph-reviewer.md
│   └── assemble-reviewer.md
└── skills/                   # Ported skills for pi's skill system
    ├── understand/SKILL.md
    ├── understand-dashboard/SKILL.md
    ├── understand-knowledge/SKILL.md
    ├── understand-explain/SKILL.md
    ├── understand-diff/SKILL.md
    └── understand-onboard/SKILL.md
```

### Extension Entry Point

`index.ts` uses the following pi extension API:

- **`pi.registerCommand("understand", ...)`** — Registers `/understand`.
  The handler parses arguments (--full, --review, --language, path) and passes
  them via the skill content. The actual pipeline orchestration is driven by
  the LLM following the skill instructions — the command handler itself is
  lightweight.

- **`pi.registerCommand("understand-dashboard", ...)`** — Registers
  `/understand-dashboard`. The command verifies the graph exists, starts a
  static file server via `serve-dashboard.ts`, and opens the browser.

- **`pi.registerCommand("understand-explain", ...)`** — Wraps UA's
  `buildExplainContext()` from `@understand-anything/skill`.

- **`pi.registerCommand("understand-diff", ...)`** — Wraps UA's
  `buildDiffContext()` from `@understand-anything/skill`.

- **`pi.registerCommand("understand-onboard", ...)`** — Wraps UA's
  `buildOnboardingGuide()` from `@understand-anything/skill`.

- **`pi.on("resources_discover", ...)`** — Returns `{ skillPaths, agentPaths }`
  pointing to the extension's `skills/` and `agents/` directories.

### /understand Pipeline

The pipeline is driven by the LLM following the skill instructions (ported from
UA's `skills/understand/SKILL.md`). The LLM uses `Agent` (from pi-subagents)
to dispatch sub-tasks:

| Phase | Name | Description |
|-------|------|-------------|
| 0 | Pre-flight | Resolve project root, check config, detect worktree |
| 1 | Scan | Enumerate files via bash/git, group by language |
| 2 | Analyze | Dispatch file-analyzer subagents in batches of 10-15 |
| 3 | Domain Analysis | Map code to business domains |
| 4 | Architecture | Generate high-level architecture view |
| 5 | Tours | Build guided walkthroughs |
| 6 | Review | Quality check the graph |
| 7 | Assemble | Merge batch results into knowledge-graph.json |

Intermediate results are written to `.understand-anything/intermediate/` on
disk (not returned to LLM context). Final output is
`.understand-anything/knowledge-graph.json`.

### Agent Compatibility

Understand-Anything ships 9 agent `.md` files. These are adapted for
pi-subagents by:
- Replacing Claude Code-specific frontmatter with pi-subagents frontmatter
- Adding explicit `tools:` allowlists
- The body content (LLM instructions) remains largely unchanged

Example adaptation:
```markdown
---
# pi-subagents format
description: Analyze project files and extract code structures
tools: read, bash, grep, find, ls
model: inherit
max_turns: 15
---

You are a file analyzer. Your job is to analyze source files...
```

### Dashboard

The React dashboard from `@understand-anything/dashboard` is built as a static
site that ships with the extension. The `/understand-dashboard` command:
1. Verifies `.understand-anything/knowledge-graph.json` exists
2. Locates the dashboard build directory relative to the extension's install
3. Starts a local HTTP server (Node `http` module, no extra deps)
4. Opens the user's browser to the dashboard URL

## Dependencies

- **pi-subagents** — Required for sub-agent dispatch (Agent tool)
- **@understand-anything/core** — Tree-sitter analysis, graph schema, types
- **@understand-anything/skill** — Context builders, prompt formatters
- **@understand-anything/dashboard** — Pre-built React dashboard

pi-subagents is already installed at `~/.pi/agent/extensions/pi-subagents/`.
The UA packages are already available at
`~/.pi/agent/extensions/Understand-Anything/`.

## Skills Mapping

| Original Skill | Pi Command | Skill File | Notes |
|----------------|------------|------------|-------|
| `/understand` | `/understand` | `skills/understand/SKILL.md` | Core pipeline, adapted for pi tools |
| `/understand-dashboard` | `/understand-dashboard` | `skills/understand-dashboard/SKILL.md` | Dashboard server |
| `/understand-knowledge` | `/understand-knowledge` | `skills/understand-knowledge/SKILL.md` | Wiki analysis, uses Python scripts |
| `/understand-explain` | `/understand-explain` | `skills/understand-explain/SKILL.md` | Wraps buildExplainContext |
| `/understand-diff` | `/understand-diff` | `skills/understand-diff/SKILL.md` | Wraps buildDiffContext |
| `/understand-onboard` | `/understand-onboard` | `skills/understand-onboard/SKILL.md` | Wraps buildOnboardingGuide |

## Implementation Order

1. Create extension structure (package.json, index.ts, paths.ts)
2. Port agent .md files for pi-subagents
3. Port skill .md files for pi tools
4. Register commands and resources in index.ts
5. Build and test with the existing UA core packages

## Decisions

- **Dashboard**: Reference the pre-built dashboard from `@understand-anything/dashboard`'s build output. No separate static build in the extension repo — the extension locates it by resolving the package path.
- **Python deps (knowledge skill)**: Bundled as-is with the skill. The skill instructions tell the LLM to run `pip install` if imports fail.
- **Distribution**: Local path install for now (`~/.pi/agent/extensions/pi-understand-anything/`), referencing UA packages via relative path or npm workspace.

## Next Steps

1. Create extension directory structure
2. Write package.json with pi metadata
3. Write index.ts entry point (commands + resources_discover)
4. Write serve-dashboard.ts
5. Write paths.ts
6. Port all 7 agent .md files for pi-subagents
7. Port all 6 skill SKILL.md files for pi
8. Build and test

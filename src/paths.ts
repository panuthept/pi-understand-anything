import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const EXTENSION_ROOT = dirname(fileURLToPath(import.meta.url));

// UA monorepo is a sibling of this extension
const UA_MONOREPO = resolve(EXTENSION_ROOT, "..", "Understand-Anything");

/**
 * Resolve the root of the Understand-Anything monorepo.
 * Throws if not found, with a helpful message.
 */
export function resolveUaRoot(): string {
  const candidates = [
    UA_MONOREPO,
    resolve(EXTENSION_ROOT, "..", "..", "Understand-Anything"),
    resolve(EXTENSION_ROOT, "..", "pi-understand-anything", "node_modules", "@understand-anything"),
  ];
  for (const path of candidates) {
    if (existsSync(resolve(path, "package.json"))) return path;
  }
  // ponytail: only filesystem checks; npm-installed fallback can go here if needed
  throw new Error(
    `Cannot find Understand-Anything monorepo.\n` +
    `Expected at any of:\n` +
    candidates.map((c) => `  - ${c}`).join("\n") +
    `\nMake sure Understand-Anything is cloned alongside this extension.`
  );
}

/**
 * Resolve the path to the pre-built dashboard directory.
 */
export function resolveDashboardBuild(): string {
  const uaRoot = resolveUaRoot();
  const dashboardPkgDir = resolve(uaRoot, "understand-anything-plugin", "packages", "dashboard");
  const buildDirs = [
    resolve(dashboardPkgDir, "dist"),
    resolve(dashboardPkgDir, "build"),
    resolve(uaRoot, "packages", "dashboard", "dist"),
    resolve(uaRoot, "packages", "dashboard", "build"),
  ];
  for (const dir of buildDirs) {
    if (existsSync(resolve(dir, "index.html"))) return dir;
  }
  // Fallback: return the expected build dir even if not found (command will error with helpful message)
  return resolve(dashboardPkgDir, "dist");
}

/**
 * Resolve a skill's directory within the Understand-Anything plugin.
 */
export function resolveUaSkillDir(skillName: string): string {
  const uaRoot = resolveUaRoot();
  return resolve(uaRoot, "understand-anything-plugin", "skills", skillName);
}

/**
 * Resolve the path to this extension's skill directory.
 */
export function resolvePiSkillDir(skillName: string): string {
  return resolve(EXTENSION_ROOT, "..", "skills", skillName);
}

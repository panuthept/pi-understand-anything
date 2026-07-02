import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const EXTENSION_ROOT = dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIST = resolve(EXTENSION_ROOT, "..", "dashboard-dist");

/**
 * Resolve the path to the pre-built dashboard directory.
 */
export function resolveDashboardBuild(): string {
  if (existsSync(resolve(DASHBOARD_DIST, "index.html"))) {
    return DASHBOARD_DIST;
  }
  return DASHBOARD_DIST; // caller will error with helpful message
}

/**
 * Resolve the path to this extension's skill directory.
 */
export function resolvePiSkillDir(skillName: string): string {
  return resolve(EXTENSION_ROOT, "..", "skills", skillName);
}

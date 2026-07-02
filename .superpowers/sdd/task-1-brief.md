### Task 1: Extension Scaffolding

**Files:**
- Create: `~/.pi/agent/extensions/pi-understand-anything/package.json`
- Create: `~/.pi/agent/extensions/pi-understand-anything/tsconfig.json`
- Create: directory structure (`src/`, `agents/`, `skills/understand/`, `skills/understand-dashboard/`, `skills/understand-knowledge/`, `skills/understand-explain/`, `skills/understand-diff/`, `skills/understand-onboard/`)

**Interfaces:**
- Consumes: UA monorepo at `~/.pi/agent/extensions/Understand-Anything/`
- Produces: Directories and config for the extension itself

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p ~/.pi/agent/extensions/pi-understand-anything/{src,agents,skills/understand,skills/understand-dashboard,skills/understand-knowledge,skills/understand-explain,skills/understand-diff,skills/understand-onboard}
```

- [ ] **Step 2: Write package.json**

```json
{
  "name": "pi-understand-anything",
  "version": "0.1.0",
  "description": "Pi extension wrapping Understand-Anything — codebase analysis, knowledge graphs, and interactive dashboard",
  "type": "module",
  "keywords": ["pi-package", "pi", "pi-coding-agent", "extension", "codebase-analysis", "knowledge-graph"],
  "license": "MIT",
  "pi": {
    "extensions": ["./index.ts"],
    "skills": ["./skills"]
  },
  "dependencies": {},
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": ">=0.74.0"
  }
}
```

**Ponytail note:** No npm deps needed — we resolve UA packages via filesystem paths. No build step required (pi loads .ts via jiti).

- [ ] **Step 3: Write basic tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["index.ts", "src/**/*.ts"]
}
```

- [ ] **Step 4: Verify structure**

```bash
ls -R ~/.pi/agent/extensions/pi-understand-anything/
```

Expected: All directories and config files present.

- [ ] **Step 5: Commit**

```bash
git -C ~/.pi/agent/extensions add openspec/changes/2026-07-02-pi-understand-anything.md
git -C ~/.pi/agent/extensions add openspec/plans/2026-07-02-pi-understand-anything.md
git -C ~/.pi/agent/extensions add pi-understand-anything/
git -C ~/.pi/agent/extensions commit -m "scaffold: pi-understand-anything extension structure"
```

---


/**
 * Dead-code / dead-schema / dead-link audit for DWIP.
 *
 * WHY A REACHABILITY WALK AND NOT "is this file imported?"
 *
 * A file imported ONLY by another dead file is itself dead, so counting
 * importers gives a false "in use". This walks real imports from the real
 * entrypoints (the two HTML entries, server.ts, the build configs, the tests)
 * and reports what nothing can reach.
 *
 * READ-ONLY. It never writes to the repo and never touches the database.
 *
 * Usage (from the repo root):
 *   node tools/audit-dead-code.mjs
 *   node tools/audit-dead-code.mjs --json > audit.json
 *
 * IMPORTANT CAVEAT, because a false "unused" here would be destructive:
 * a specifier this script cannot resolve (a path alias it does not know, a
 * runtime-computed import, a file loaded by a bundler convention) will make a
 * file look unreachable when it is not. Every "unreachable" row is a LEAD to
 * verify by hand, never a delete list. See .agents/AGENTS.md.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.argv[2] || process.cwd();
const asJson = process.argv.includes("--json");

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "_quarantine", "backups", "playwright-report",
  "test-results", "android", "public", "imports",
]);

const read = (p) => {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
};
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

/** Every file worth scanning, excluding build output and vendored trees. */
function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(path.join(dir, e.name), out);
    } else {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

const SCANNABLE = /\.(ts|tsx|js|jsx|mjs|cjs|html|json|sql)$/;
const allFiles = walk(ROOT).filter((f) => SCANNABLE.test(f));
const fileSet = new Set(allFiles.map((f) => path.normalize(f)));

/**
 * Resolve a module specifier to a file on disk.
 * Handles relative paths, the "@/*" tsconfig alias, and the extensionless /
 * index-file forms. Returns null for bare specifiers (npm packages).
 */
function resolveSpec(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith("./") || spec.startsWith("../")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;

  const candidates = [
    base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.mjs`,
    `${base}.json`, path.join(base, "index.ts"), path.join(base, "index.tsx"),
    path.join(base, "index.js"),
  ];
  for (const c of candidates) {
    const n = path.normalize(c);
    if (fileSet.has(n)) return n;
  }
  return null;
}

/** All module specifiers a file pulls in: import, export-from, require, dynamic import. */
function specifiersOf(text) {
  const specs = [];
  const push = (s) => { if (s && (s.startsWith("./") || s.startsWith("../") || s.startsWith("@/"))) specs.push(s); };
  for (const m of text.matchAll(/(?:^|\n)\s*import\s+[^;'"]*?from\s*["']([^"']+)["']/g)) push(m[1]);
  for (const m of text.matchAll(/export\s+[^;'"]*?from\s*["']([^"']+)["']/g)) push(m[1]);
  for (const m of text.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) push(m[1]);
  for (const m of text.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/g)) push(m[1]);
  // side-effect imports: import "./x"
  for (const m of text.matchAll(/(?:^|\n)\s*import\s*["']([^"']+)["']/g)) push(m[1]);
  return [...new Set(specs)];
}

// ── 1. REACHABILITY ─────────────────────────────────────────────────────────

const roots = [];
for (const f of allFiles) {
  const r = rel(f);
  if (r === "server.ts") { roots.push(f); continue; }
  if (/^(index|customer-index)\.html$/.test(r)) { roots.push(f); continue; }
  if (/(vite|vitest|playwright|capacitor)\.config\.ts$/.test(r)) { roots.push(f); continue; }
  if (/^src\/tests\//.test(r) || /\.(e2e\.)?spec\.ts$/.test(r) || /\.test\.ts$/.test(r)) { roots.push(f); continue; }
  if (/^tools\//.test(r) || /^test-infra\//.test(r)) { roots.push(f); continue; }
  // HTML entries reference their script via <script src>, handled below.
}

const reached = new Set(roots);
const queue = [...roots];
while (queue.length) {
  const file = queue.pop();
  const text = read(file);
  const next = [];
  for (const spec of specifiersOf(text)) {
    const r = resolveSpec(spec, file);
    if (r) next.push(r);
  }
  // index.html / customer-index.html name their entry in a script tag.
  for (const m of text.matchAll(/<script[^>]+src=["']([^"']+)["']/g)) {
    const r = resolveSpec("./" + m[1].replace(/^\/+/, ""), path.join(ROOT, "index.html"));
    if (r) next.push(r);
  }
  for (const n of next) {
    if (!reached.has(n)) { reached.add(n); queue.push(n); }
  }
}

// rel() already normalises separators to "/", so filter on that rather than on
// a character class — a Windows path separator is "\\" and a regex class of
// [\/] silently collapses to a single "/", which matched nothing.
const srcFiles = allFiles.filter((f) => rel(f).startsWith("src/") && /\.(ts|tsx)$/.test(f));
const unreachableAll = srcFiles.filter((f) => !reached.has(f));

// Files a TOOL loads by convention, not by import (drizzle-kit reads its config
// by name). These are not dead just because no module imports them.
const isConventionLoaded = (f) => /(^|\/)[a-z0-9.-]*\.config\.ts$/.test(rel(f));
const conventionLoaded = unreachableAll.filter(isConventionLoaded);
const unreachable = unreachableAll.filter((f) => !isConventionLoaded(f));

// Which unreachable files DO have an importer? Those need judgement (imported
// only by other dead code, or the alias walk missed something).
const importerOf = new Map();
for (const f of allFiles) {
  if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f)) continue;
  for (const spec of specifiersOf(read(f))) {
    const r = resolveSpec(spec, f);
    if (r) {
      if (!importerOf.has(r)) importerOf.set(r, []);
      importerOf.get(r).push(rel(f));
    }
  }
}

// ── 2. TABS, RENDER CHAIN, WORKSPACE MAPPING ────────────────────────────────

const appSrc = read(path.join(ROOT, "src", "App.tsx"));
const shellSrc = read(path.join(ROOT, "src", "components", "AppShell.tsx"));

const roleTabIds = new Set();
const roleTabBlock = appSrc.slice(appSrc.indexOf("const ROLE_TABS"), appSrc.indexOf("const GATE_IN_ROLES"));
for (const m of roleTabBlock.matchAll(/\{\s*id:\s*"([^"]+)"/g)) roleTabIds.add(m[1]);
// Tabs appended programmatically to every role.
for (const m of appSrc.matchAll(/tabs\.(?:push|unshift|splice)\([^)]*?id:\s*"([^"]+)"/g)) roleTabIds.add(m[1]);
for (const m of appSrc.matchAll(/id:\s*"(my-workspace|leave-management|holidays|grievance|training-development|employee-performance|attendance|tech-profile)"/g)) roleTabIds.add(m[1]);

const renderIds = new Set();
for (const m of appSrc.matchAll(/activeTab\s*===\s*"([^"]+)"/g)) renderIds.add(m[1]);

const mappedIds = new Set();
const mappingBlock = shellSrc.slice(shellSrc.indexOf("WORKSPACE_MAPPING"), shellSrc.indexOf("export const WORKSPACES"));
// Keys may be quoted ("my-workspace") or bare (dashboard, jobs) — a quoted-only
// match reported half the live map as "missing", which is worse than no audit.
for (const m of mappingBlock.matchAll(/^\s*"?([A-Za-z0-9_-]+)"?\s*:\s*"([^"]*)"/gm)) mappedIds.add(m[1]);

const tabChecks = {
  navTabWithNoRenderBranch: [...roleTabIds].filter((id) => !renderIds.has(id)).sort(),
  renderBranchWithNoNavTab: [...renderIds].filter((id) => !roleTabIds.has(id)).sort(),
  tabMissingWorkspaceMapping: [...roleTabIds].filter((id) => !mappedIds.has(id)).sort(),
};

// ── 3. DEAD LINKS ───────────────────────────────────────────────────────────

const serverSrc = read(path.join(ROOT, "server.ts"));
// Frontend only: server.ts must be excluded, or every "/api/..." literal in the
// server counts as a caller and NOTHING is ever reported as uncalled.
const allSrcText = allFiles
  .filter((f) => /\.(ts|tsx)$/.test(f) && rel(f) !== "server.ts")
  .map((f) => read(f))
  .join("\n");

const linkTargets = new Set();
for (const m of serverSrc.matchAll(/\blink:\s*"([^"]+)"/g)) linkTargets.add(m[1]);
for (const m of allSrcText.matchAll(/\blink:\s*"([^"]+)"/g)) linkTargets.add(m[1]);
const deadLinks = [...linkTargets]
  .filter((l) => !l.includes("/") && !l.includes("${"))
  .filter((l) => !roleTabIds.has(l) && !renderIds.has(l))
  .sort();

// ── 4. SERVER ENDPOINTS vs FRONTEND CALLS ───────────────────────────────────

const norm = (u) => u.replace(/\$\{[^}]*\}/g, ":_").replace(/:[A-Za-z_][A-Za-z0-9_]*/g, ":_").replace(/\/+$/, "");

const serverEndpoints = new Set();
for (const m of serverSrc.matchAll(/app\.(?:get|post|put|patch|delete)\(\s*["'`](\/api\/[^"'`]*)["'`]/g)) {
  serverEndpoints.add(m[1]);
}
const routerMounts = [...serverSrc.matchAll(/app\.use\(\s*["'`](\/api\/[a-z0-9-]+)["'`]\s*,\s*([A-Za-z0-9_]+)/g)]
  .map((m) => ({ prefix: m[1], varName: m[2] }));
const routerFiles = {};
for (const f of allFiles) {
  if (!/^src[\\/]api[\\/]routes[\\/].*\.ts$/.test(rel(f))) continue;
  const src = read(f);
  const nameMatch = src.match(/export const (\w+)\s*=/);
  if (nameMatch) routerFiles[nameMatch[1]] = { file: rel(f), routes: [] };
  for (const m of src.matchAll(/\.(?:get|post|put|patch|delete)\(\s*["'`](\/[^"'`]*)["'`]/g)) {
    if (nameMatch && routerFiles[nameMatch[1]]) routerFiles[nameMatch[1]].routes.push(m[1]);
  }
}
const mountedRouters = new Set(routerMounts.map((m) => m.varName));
const unmountedRouters = Object.entries(routerFiles)
  .filter(([name]) => !mountedRouters.has(name))
  .map(([name, v]) => ({ router: name, file: v.file, routeCount: v.routes.length }));

/**
 * Frontend path discovery, deliberately over-inclusive.
 *
 * Two shapes have to be caught or the report lies:
 *   fetch("/api/x")                        - a quoted literal
 *   fetch(`/api/x?ids=${k}`)               - a literal followed by a QUERY STRING,
 *                                            so the literal must not have to be
 *                                            immediately followed by a quote
 *   fetch(`${API_BASE}/auth/request-otp`)  - the portal's shape, where the path is
 *                                            PREFIX + suffix and neither half
 *                                            appears as a complete literal
 *
 * The third case cannot be resolved without real dataflow, so instead of
 * pretending it can be, endpoints are put in one of three buckets: matched
 * exactly, matched only by PREFIX (uncertain), or matched by nothing at all.
 * Only the last bucket is reported as a lead.
 */
const frontendLiterals = new Set();
const frontendFragments = new Set();
for (const m of allSrcText.matchAll(/["'`]([^"'`\n]{2,200})["'`]/g)) {
  const s = m[1];
  if (!s.includes("/")) continue;
  frontendLiterals.add(norm(s));
  if (s.includes("/api")) frontendFragments.add(s.split("?")[0]);
}
for (const m of allSrcText.matchAll(/\/api\/[A-Za-z0-9\-_/.${}:]+/g)) {
  frontendLiterals.add(norm(m[0]));
}

const uncalledEndpoints = [];
const prefixOnlyEndpoints = [];
for (const e of serverEndpoints) {
  const ne = norm(e);
  if (frontendLiterals.has(ne)) continue;
  const byPrefix = [...frontendFragments].some(
    (f) => f.length > 6 && (ne.startsWith(f) || f.startsWith(ne))
  );
  (byPrefix ? prefixOnlyEndpoints : uncalledEndpoints).push(e);
}
const unmountedRoutePaths = Object.entries(routerFiles)
  .filter(([name]) => !mountedRouters.has(name))
  .flatMap(([, v]) => v.routes);

// ── 5. SCHEMA ───────────────────────────────────────────────────────────────

const sqlFiles = allFiles.filter((f) => f.endsWith(".sql") || /\.(ts)$/.test(f));
const tableNames = new Set();
for (const f of allFiles) {
  const r = rel(f);
  if (!(r.startsWith("drizzle_mysql/") || r === "server.ts" || /^src[\\/]db[\\/]/.test(r) || r.startsWith("test-infra/"))) continue;
  const text = read(f);
  for (const m of text.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?([a-zA-Z0-9_]+)`?/gi)) tableNames.add(m[1]);
  for (const m of text.matchAll(/CREATE\s+OR\s+REPLACE\s+VIEW\s+`?([a-zA-Z0-9_]+)`?/gi)) tableNames.add(m[1]);
}

// Everything except the DDL files themselves + migrations.
const codeCorpus = allFiles
  .filter((f) => {
    const r = rel(f);
    if (r.startsWith("drizzle_mysql/")) return false;
    if (/FILE_AUDIT|MANIFEST|audit-dead-code/.test(r)) return false;
    if (r.endsWith(".sql")) return false;
    return /\.(ts|tsx|mjs|cjs)$/.test(r) || r === "server.ts";
  })
  .map((f) => read(f))
  .join("\n");
const codeCorpusNoServer = allFiles
  .filter((f) => {
    const r = rel(f);
    if (r === "server.ts" || r.startsWith("drizzle_mysql/") || r.endsWith(".sql")) return false;
    return /\.(ts|tsx|mjs|cjs)$/.test(r);
  })
  .map((f) => read(f))
  .join("\n");

const unusedTables = [];
const serverOnlyTables = [];
for (const t of [...tableNames].sort()) {
  const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  if (!re.test(codeCorpus)) unusedTables.push(t);
  else if (!re.test(codeCorpusNoServer)) serverOnlyTables.push(t);
}

// ── REPORT ──────────────────────────────────────────────────────────────────

const result = {
  unreachable: unreachable.map(rel), conventionLoaded: conventionLoaded.map(rel),
  unreachableWithImporters: unreachable.map((f) => ({ file: rel(f), importedBy: importerOf.get(f) || [] })),
  prefixOnlyEndpoints,
  tabChecks, deadLinks, unmountedRouters, unmountedRoutePaths,
  uncalledEndpointCount: uncalledEndpoints.length, uncalledEndpoints,
  tableCount: tableNames.size, unusedTables, serverOnlyTables,
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const h = (t) => console.log(`\n${"=".repeat(72)}\n${t}\n${"=".repeat(72)}`);

  h("0. WHY THIS IS A LEAD LIST, NOT A DELETE LIST");
  console.log("  Reachability can only see import statements. A file loaded by a bundler");
  console.log("  convention, by a path alias this script does not know, or by a runtime-");
  console.log("  computed import will be reported as unreachable while being live. Verify");
  console.log("  every row by hand before quarantining anything (.agents/AGENTS.md).");

  h(`1. UNREACHABLE SOURCE FILES from entrypoints  (${unreachable.length} of ${srcFiles.length} scanned)`);
  for (const f of result.unreachableWithImporters) {
    console.log(`  ${f.importedBy.length ? "*" : "!"} ${f.file}`);
    if (f.importedBy.length) console.log(`      imported only by: ${f.importedBy.join(", ")}`);
  }
  console.log(`\n  "!" = nothing imports it at all.  "*" = has importers, but they are themselves unreachable.`);
  console.log(`  Excluded as convention-loaded (not dead): ${conventionLoaded.map(rel).join(", ") || "none"}`);

  h("2. TAB / SCREEN WIRING");
  console.log(`  In ROLE_TABS but no render branch (tab shows a blank screen): ${tabChecks.navTabWithNoRenderBranch.join(", ") || "none"}`);
  console.log(`  Render branch but no tab in ROLE_TABS (unreachable screen):    ${tabChecks.renderBranchWithNoNavTab.join(", ") || "none"}`);
  console.log(`  Tab missing from WORKSPACE_MAPPING (invisible in nav):         ${tabChecks.tabMissingWorkspaceMapping.join(", ") || "none"}`);

  h(`3. DEAD LINKS  (${deadLinks.length})`);
  console.log(deadLinks.length ? "  " + deadLinks.join(", ") : "  none");

  h("4. UNMOUNTED ROUTERS (dead route files)");
  for (const r of unmountedRouters) console.log(`  ${r.file}  -  ${r.routeCount} routes, never mounted`);

  h(`5. SERVER ENDPOINTS WITH NO src/ CALLER  (${uncalledEndpoints.length} of ${serverEndpoints.size}; ${prefixOnlyEndpoints.length} more are prefix-only/uncertain)`);
  console.log("  CAVEATS - verify each before treating it as dead:");
  console.log("    - a cron/sweeper inside server.ts may call it server-side;");
  console.log("    - the Android/Capacitor shell or an external client may call it;");
  console.log("    - a path assembled at runtime cannot be seen by static analysis.");
  for (const e of uncalledEndpoints.slice(0, 120)) console.log(`  ${e}`);
  if (uncalledEndpoints.length > 120) console.log(`  ... and ${uncalledEndpoints.length - 120} more`);
  h(`5b. PREFIX-ONLY MATCHES (uncertain, NOT evidence of anything)  (${prefixOnlyEndpoints.length})`);
  for (const e of prefixOnlyEndpoints.slice(0, 40)) console.log(`  ~ ${e}`);

  h(`6. SCHEMA  (${tableNames.size} tables/views found in DDL)`);
  console.log(`  Referenced NOWHERE in code: ${unusedTables.length}`);
  console.log(`  Referenced ONLY from server.ts (not from any src/ module): ${serverOnlyTables.length}`);
  console.log(`\n  -- nowhere in code --`);
  for (const t of unusedTables) console.log(`    ${t}`);
  console.log(`\n  -- server.ts only --`);
  for (const t of serverOnlyTables) console.log(`    ${t}`);
}

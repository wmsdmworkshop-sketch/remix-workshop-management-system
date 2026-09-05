#!/usr/bin/env node
/**
 * no-fabricated-data.mjs — build-time guard against EAR-001 Rule 5 violations
 * (the real-data-only contract: no invented values shown as if they were real).
 *
 * This is a REGRESSION guard, not a general detector. Each rule pins a specific
 * fabrication that was found in a live audit and removed, so it cannot creep back
 * in. It cannot catch a brand-new invention nobody has seen yet — that still
 * needs review.
 *
 * Lives in tools/ (NOT scripts/) on purpose: .dockerignore excludes scripts/, so
 * a guard placed there would be missing inside the production image and every
 * Cloud Build would fail with "module not found".
 *
 * Scans src/ recursively AND server.ts — several rules below target fabrications
 * that lived in server.ts, so omitting it would miss the exact place one already
 * happened.
 *
 * Escape hatch: append  // realdata-allow  to a line that is legitimately allowed
 * (e.g. a documented format template), with a comment saying why.
 *
 * Usage:  node tools/no-fabricated-data.mjs
 * Exit:   0 clean (or warnings only), 1 if any ERROR found.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative, extname } from "path";

// ─── Rules: each pins a fabrication found and removed in a real audit ────────
const RULES = [
  // Fabricated personal / KYC identifiers (My Profile)
  { pattern: /ABCDE\*+F/i, label: "Fabricated PAN number", severity: "ERROR" },
  { pattern: /\*{4,}9088/i, label: "Fabricated Aadhaar number", severity: "ERROR" },
  { pattern: /HDFC000\d{4}/i, label: "Fabricated bank IFSC", severity: "ERROR" },
  { pattern: /A\/C:\s*\*+\d{4}/i, label: "Fabricated bank account", severity: "ERROR" },

  // Fabricated identities used as operational data.
  // NOTE: "SAYEED JAFFER" is deliberately NOT listed — that is the real Devanand
  // Service GM (CSJ_100B210) in the TMSA config, i.e. genuine dealership data.
  { pattern: /["']Ravi Kumar["']/i, label: "Fabricated technician (Ravi Kumar)", severity: "ERROR" },
  { pattern: /["']Sanjay Patel["']/i, label: "Fabricated technician (Sanjay Patel)", severity: "ERROR" },
  { pattern: /["']Anand Shinde["']/i, label: "Fabricated technician (Anand Shinde)", severity: "ERROR" },
  { pattern: /["']Sunil Kumar["']/i, label: "Fabricated advisor (Sunil Kumar)", severity: "ERROR" },
  { pattern: /\|\|\s*["']Sayeed Jaffer["']/i, label: "Advisor-name fallback to a hardcoded person", severity: "ERROR" },

  // `value || "convincing fake"` fallbacks — the recurring failure mode
  { pattern: /\|\|\s*["']Devalapura Terminal/i, label: "Fabricated workshop fallback", severity: "ERROR" },
  { pattern: /\|\|\s*["']Workshop Manager \(Admin\)["']/i, label: "Fabricated reporting-manager fallback", severity: "ERROR" },
  { pattern: /\|\|\s*["']2026-06-01["']/i, label: "Fabricated joining-date fallback", severity: "ERROR" },
  { pattern: /\|\|\s*["']Devanand Logistics["']/i, label: "Fabricated customer fallback", severity: "ERROR" },
  { pattern: /\|\|\s*["']KA32M9988["']/i, label: "Fabricated VRN fallback", severity: "ERROR" },
  { pattern: /\|\|\s*30000\b/, label: "Fabricated salary fallback", severity: "ERROR" },
  { pattern: /\|\|\s*["']Senior["']/i, label: "Employee-grade fallback to a made-up grade", severity: "WARN" },

  // Mock datasets standing in for a real source
  { pattern: /mock[A-Z]\w*Db\s*=\s*\[/, label: "Mock database array", severity: "ERROR" },
  { pattern: /mockPartsDb/i, label: "Mock parts database", severity: "ERROR" },

  // Fabricated metrics served from the API as if measured
  { pattern: /warrantyRecoveryCount:\s*\d/, label: "Hardcoded warranty recovery count", severity: "ERROR" },
  { pattern: /amcSalesGrowthPercent:\s*\d/, label: "Hardcoded AMC sales growth", severity: "ERROR" },
  { pattern: /fleetRetentionIndex:\s*[\d.]/, label: "Hardcoded fleet retention index", severity: "ERROR" },
  { pattern: /customerRetentionIndex:\s*[\d.]/, label: "Hardcoded customer retention index", severity: "ERROR" },
  { pattern: /repeatComplaintsRate:\s*[\d.]/, label: "Hardcoded repeat complaints rate", severity: "ERROR" },
  { pattern: /technicianProductivityPercent:\s*\d/, label: "Hardcoded technician productivity", severity: "ERROR" },
  { pattern: /confidenceScore:\s*0\.\d/, label: "Invented AI confidence score", severity: "ERROR" },

  // Fabricated vehicle identifiers derived from the VRN
  { pattern: /MAT451\d{3}[A-Z]\$?\{?\w*\}?Z/i, label: "Fabricated chassis/VIN pattern", severity: "WARN" },
  { pattern: /6BT5\.9-/i, label: "Fabricated engine-number pattern", severity: "WARN" },
  { pattern: /27AAAAA\$?\{?\w*\}?A1Z2/i, label: "Fabricated GSTIN pattern", severity: "ERROR" },

  // Static text presented as machine intelligence, and fake success
  { pattern: /AI SUGGESTION:.*(?:Prioritize|auto-approve|Similar clutch|recorded [\d,]+ km)/i, label: "Static text presented as an AI suggestion", severity: "ERROR" },
  { pattern: /Claim #CF-9080/i, label: "Fabricated warranty claim reference", severity: "ERROR" },
  { pattern: /JC-444519/i, label: "Fabricated job-card reference", severity: "ERROR" },
  { pattern: /Mock invoice sent/i, label: "Fake success message (nothing was printed)", severity: "ERROR" },
  { pattern: /Rajesh Kumar/i, label: "Fabricated invoice fallback data", severity: "ERROR" },
];

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", "tests", "__tests__"]);
// src/db/seed/ holds canonical fixture RECORDS (fixed UUIDs, PUB-*-1001 ids), the
// same category as tests. Note: those fixtures are imported by production
// repositories, so whether they can surface on real reads is worth its own review
// — it is simply not what this UI-facing guard is checking.
const SKIP_FILE_PATTERNS = [
  /\.test\.tsx?$/, /\.spec\.tsx?$/, /[\\/]tests?[\\/]/i, /test-infra[\\/]/i,
  /[\\/]db[\\/]seed[\\/]/i,
];
const ALLOWED_EXTENSIONS = new Set([".ts", ".tsx"]);

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (ALLOWED_EXTENSIONS.has(extname(entry))) out.push(full);
  }
  return out;
}

const isTestFile = (p) => SKIP_FILE_PATTERNS.some((r) => r.test(p));

function scanFile(filePath, rootDir) {
  const lines = readFileSync(filePath, "utf-8").split("\n");
  const relPath = relative(rootDir, filePath);
  const violations = [];
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    // Track /* ... */ blocks so the explanatory comments describing a REMOVED
    // fabrication don't re-trigger the rule that documents it.
    if (inBlockComment) {
      if (line.includes("*/")) inBlockComment = false;
      continue;
    }
    // Both `/* … */` and the JSX form `{/* … */}` can span lines. Their
    // continuation lines start with ordinary prose, so without tracking the open
    // block a comment DESCRIBING a removed fabrication re-triggers its own rule.
    if (line.startsWith("/*") || line.startsWith("{/*")) {
      if (!line.includes("*/")) inBlockComment = true;
      continue;
    }
    if (line.startsWith("//") || line.startsWith("*")) continue;
    if (/realdata-allow/.test(raw)) continue; // documented, deliberate exception

    for (const rule of RULES) {
      if (rule.pattern.test(raw)) {
        violations.push({
          file: relPath, line: i + 1, severity: rule.severity,
          label: rule.label, snippet: line.substring(0, 120),
        });
      }
    }
  }
  return violations;
}

const rootDir = process.cwd();
const targets = [
  ...walk(join(rootDir, "src")),
  join(rootDir, "server.ts"), // several rules target fabrications that lived here
].filter((f) => existsSync(f) && !isTestFile(f));

console.log("Scanning for fabricated data (EAR-001 Rule 5)...\n");

const all = targets.flatMap((f) => scanFile(f, rootDir));
const errors = all.filter((v) => v.severity === "ERROR");
const warnings = all.filter((v) => v.severity === "WARN");

const print = (list, heading) => {
  console.log(`${heading}\n`);
  for (const v of list) {
    console.log(`  ${v.file}:${v.line}  — ${v.label}`);
    console.log(`      ${v.snippet}\n`);
  }
};

if (errors.length) print(errors, `${errors.length} ERROR(s) — fabricated data in production code:`);
if (warnings.length) print(warnings, `${warnings.length} WARNING(s):`);

console.log(`Scanned ${targets.length} files — ${errors.length} error(s), ${warnings.length} warning(s).`);

if (errors.length) {
  console.log(
    "\nBUILD BLOCKED. Show real data or an honest empty state ('—', 'Not on file').\n" +
    "If a match is genuinely legitimate, append  // realdata-allow  with a reason.\n"
  );
  process.exit(1);
}
console.log("Real-data check passed.\n");
process.exit(0);

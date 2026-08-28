/**
 * Post-`cap sync` prune of android/app/src/main/assets/public.
 *
 * Capacitor copies webDir (dist/) wholesale into the APK. dist/ is also the
 * server's output directory and the public web root, so without this step the
 * mobile app ships things it has no use for and must not carry:
 *
 *   server.cjs        the compiled backend (~1 MB)
 *   server.cjs.map    source map embedding the original TypeScript of 73 files
 *   downloads/*.apk   ~14.5 MB of OTHER apks packaged inside this one
 *   uploads/          real OCR evidence images — customer number-plate photos
 *
 * An APK is a zip. Anyone can unzip it, so anything in here is effectively
 * published. The uploads/ directory is the sharpest edge: it held a real
 * number-plate capture, which would have been distributed to every device that
 * installed the app.
 *
 * Run after `npx cap sync android` and before any Gradle build.
 *
 *   node scripts/prune_android_assets.cjs           # dry run
 *   node scripts/prune_android_assets.cjs --apply
 */

const fs = require("fs");
const path = require("path");

const APPLY = process.argv.includes("--apply");
const ASSETS = path.join("android", "app", "src", "main", "assets", "public");

/**
 * Names that must never ship, matched at ANY depth.
 *
 * Depth matters: the customer portal is a second Vite build
 * (vite.customer.config.ts) that copies public/ into dist/customer-portal/, so
 * every one of these exists twice — once at the root and once nested. A
 * top-level-only prune looked like it had worked while leaving 14.8 MB of apks
 * and the number-plate capture inside base/assets/public/customer-portal/.
 */
const REMOVE_NAMES = new Set(["server.cjs", "server.cjs.map", "downloads", "uploads"]);

/** Walks the asset tree and returns every path whose basename is excluded. */
function findTargets(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (REMOVE_NAMES.has(e.name)) {
      out.push(p);
      continue; // no need to descend into something being deleted
    }
    if (e.isDirectory()) findTargets(p, out);
  }
  return out;
}

function sizeOf(p) {
  const st = fs.statSync(p);
  if (!st.isDirectory()) return st.size;
  return fs
    .readdirSync(p)
    .reduce((sum, f) => sum + sizeOf(path.join(p, f)), 0);
}

const human = (n) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`;

if (!fs.existsSync(ASSETS)) {
  console.error(`Assets directory not found: ${ASSETS}\nRun 'npx cap sync android' first.`);
  process.exit(1);
}

let total = 0;
const found = [];
for (const abs of findTargets(ASSETS)) {
  const bytes = sizeOf(abs);
  total += bytes;
  found.push({ rel: path.relative(ASSETS, abs), p: abs, bytes });
}

if (found.length === 0) {
  console.log("Nothing to prune — assets are already clean.");
  process.exit(0);
}

console.log(`Found ${found.length} item(s) totalling ${human(total)}:`);
for (const f of found) console.log(`  ${f.rel.padEnd(52)} ${human(f.bytes)}`);

// Any file under uploads/ is real captured data — call it out explicitly.
const uploadDirs = found.filter((f) => path.basename(f.rel) === "uploads");
for (const u of uploadDirs) {
  const list = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const q = path.join(d, e.name);
      e.isDirectory() ? walk(q) : list.push(path.relative(ASSETS, q));
    }
  })(u.p);
  console.log(`\n  ${u.rel} contains ${list.length} real captured file(s):`);
  for (const f of list.slice(0, 10)) console.log(`    ${f}`);
}

if (!APPLY) {
  console.log("\nDry run. Re-run with --apply to remove these from the APK payload.");
  process.exit(0);
}

for (const f of found) {
  fs.rmSync(f.p, { recursive: true, force: true });
  console.log(`removed ${f.rel}`);
}
console.log(`\nPruned ${human(total)} from the APK payload.`);

const remaining = findTargets(ASSETS).map((p) => path.relative(ASSETS, p));
console.log(
  remaining.length === 0
    ? "VERIFIED: no excluded path remains at any depth."
    : `WARNING: still present -> ${remaining.join(", ")}`
);

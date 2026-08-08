/**
 * reset_user_passwords.cjs
 *
 * Resets any user account whose password STILL matches a known leaked default
 * to a fresh random password. Accounts whose password has already been changed
 * are left untouched.
 *
 *   LEAKED_DEFAULTS="pw1,pw2,..." node scripts/reset_user_passwords.cjs           # dry run
 *   LEAKED_DEFAULTS="pw1,pw2,..." node scripts/reset_user_passwords.cjs --apply    # perform resets
 *
 * The candidate leaked passwords are supplied at RUNTIME via the LEAKED_DEFAULTS
 * env var (comma-separated) so they are never hardcoded/committed here. DB
 * connection is read from the environment (.env). Run this only AFTER the Cloud
 * SQL network has been locked down. New passwords are printed ONCE — copy them,
 * distribute securely, and require a reset on first login.
 */
require("dotenv").config();
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

// Candidate leaked/seed-default passwords to detect — supplied at runtime, never
// committed. e.g. LEAKED_DEFAULTS="pw1,pw2,pw3"
const KNOWN_LEAKED_DEFAULTS = (process.env.LEAKED_DEFAULTS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (KNOWN_LEAKED_DEFAULTS.length === 0) {
  console.error(
    "No candidate passwords provided. Set LEAKED_DEFAULTS to a comma-separated " +
      'list, e.g. LEAKED_DEFAULTS="pw1,pw2,pw3" node scripts/reset_user_passwords.cjs'
  );
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

function randomPassword() {
  // 16-char url-safe (~96 bits entropy)
  return crypto.randomBytes(12).toString("base64url");
}

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || "railway",
    ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 10000,
  });

  console.log(`Mode: ${APPLY ? "APPLY (will reset)" : "DRY RUN (no changes)"}`);
  console.log(`Target DB: ${process.env.DB_DATABASE || "railway"} @ ${process.env.DB_HOST}\n`);

  const [users] = await conn.query(
    "SELECT user_id, username, password_hash FROM users WHERE password_hash IS NOT NULL"
  );

  const affected = [];
  for (const u of users) {
    for (const def of KNOWN_LEAKED_DEFAULTS) {
      let match = false;
      try {
        match = await bcrypt.compare(def, u.password_hash);
      } catch {
        /* malformed hash — skip */
      }
      if (match) {
        affected.push({ user_id: u.user_id, username: u.username, leaked: def });
        break;
      }
    }
  }

  if (affected.length === 0) {
    console.log("✅ No accounts are using a known leaked default password. Nothing to do.");
    await conn.end();
    return;
  }

  console.log(`Found ${affected.length} account(s) still on a leaked default:\n`);

  if (!APPLY) {
    for (const a of affected) {
      console.log(`  - ${a.username} (user_id=${a.user_id}) — currently "${a.leaked}"`);
    }
    console.log("\nRe-run with --apply to reset these to fresh random passwords.");
    await conn.end();
    return;
  }

  console.log("username\ttemporary_password");
  console.log("--------\t------------------");
  for (const a of affected) {
    const newPass = randomPassword();
    const hash = await bcrypt.hash(newPass, 10);
    await conn.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", [hash, a.user_id]);
    console.log(`${a.username}\t${newPass}`);
  }

  console.log(
    `\n✅ Reset ${affected.length} account(s). Distribute these passwords securely ` +
      `and require a reset on first login. This list is shown only once.`
  );
  await conn.end();
})().catch((e) => {
  console.error("FATAL:", e.code || "", e.message);
  process.exit(1);
});

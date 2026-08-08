import crypto from "node:crypto";

// Tracks usernames we've already logged a generated password for, so a repeated
// seed pass in the same process doesn't spam the log.
const warnedUsers = new Set<string>();

/**
 * Resolve the password to seed a user account with.
 *
 * Security: NEVER returns a hardcoded or shared default. If the given env var is
 * set, that value is used; otherwise a strong random password is generated and
 * logged ONCE at WARN so an operator can capture it and force a reset.
 *
 * @param envVar  Name of the env var that may supply an explicit seed password
 *                (e.g. SEED_DEFAULT_PASSWORD).
 * @param username Account being seeded — used only for the one-time log line.
 */
export function resolveSeedPassword(
  envVar: string,
  username: string
): { password: string; generated: boolean } {
  const fromEnv = process.env[envVar];
  if (fromEnv && fromEnv.trim().length > 0) {
    return { password: fromEnv, generated: false };
  }

  // 16-char url-safe random password (~96 bits of entropy).
  const password = crypto.randomBytes(12).toString("base64url");
  if (!warnedUsers.has(username)) {
    warnedUsers.add(username);
    console.warn(
      `[SEED] ${envVar} not set — generated a temporary password for '${username}': ${password} ` +
        `(store it securely and force a reset; set ${envVar} to control this).`
    );
  }
  return { password, generated: true };
}

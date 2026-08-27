/**
 * =============================================================================
 * DWIP Enterprise Platform — AI Route Rate Limiter
 * Bounded Context: Platform Protection / Cost Control
 *
 * Token-bucket limiter guarding the routes that make paid outbound calls
 * (DeepSeek, Azure Document Intelligence, Vertex AI). Its purpose is cost and
 * abuse control, not security: a runaway client loop or a stuck retry should
 * not be able to burn the workshop's API budget in minutes.
 *
 * ── OPERATIONAL LIMITS OF THIS IMPLEMENTATION (read before relying on it) ──
 *
 * 1. State is IN-MEMORY and therefore PER CONTAINER INSTANCE. The live
 *    dwip-enterprise service runs with maxScale 3, so the real worst-case
 *    ceiling is (limit x instance count), not `limit`. It is a spend guardrail,
 *    not a hard quota. A hard quota needs shared state (Redis / Memorystore),
 *    which is deliberately not introduced here.
 *
 * 2. Buckets reset when an instance restarts or scales to zero. That is
 *    acceptable for cost control and is not a security boundary.
 *
 * ── TENANT KEY ──
 *
 * The brief specifies "per workshop" via `req.user.workshop_id`. That claim was
 * checked against the real token: the JWT signed in server.ts carries exactly
 * user_id, username, full_name, role and employee_id — there is NO workshop_id
 * or branch claim on it. Keying solely on `workshop_id` would therefore have
 * fallen through to IP for every authenticated request, and since staff share
 * the dealership's NAT egress IP on site WiFi, the whole workshop would have
 * collapsed into one bucket and throttled each other.
 *
 * So resolution walks a documented chain, most specific first, and lands on the
 * per-user identity that actually exists today. `workshop_id` is honoured first
 * so that adding the claim later upgrades this to true per-workshop limiting
 * with no code change.
 * =============================================================================
 */

import type { Request, Response, NextFunction } from "express";

/** Requests permitted per window, per resolved key. Env-overridable. */
const DEFAULT_LIMIT_PER_MINUTE = 60;

/** Window length. Token refill is continuous, not a fixed reset boundary. */
const WINDOW_MS = 60_000;

/** Idle buckets are swept after this long to bound memory. */
const BUCKET_TTL_MS = 5 * 60_000;

/** How often the sweeper runs. */
const SWEEP_INTERVAL_MS = 60_000;

export interface RateLimiterOptions {
  /** Requests allowed per minute. Defaults to AI_RATE_LIMIT_PER_MINUTE, then 60. */
  limitPerMinute?: number;
  /** Label used in log lines and the error payload, e.g. "AI". */
  bucketName?: string;
  /** Escape hatch for routes that should never be limited (health checks). */
  skip?: (req: Request) => boolean;
}

interface TokenBucket {
  /** Fractional tokens remaining. */
  tokens: number;
  /** Epoch ms of the last refill calculation. */
  lastRefillAt: number;
  /** Epoch ms this bucket was last touched, for sweeping. */
  lastSeenAt: number;
}

/**
 * Resolves the configured limit once at module load.
 * An unparseable or non-positive value falls back to the default rather than
 * silently disabling the limiter (0 would otherwise reject every request, and a
 * NaN would make every comparison false and admit every request).
 */
function resolveConfiguredLimit(explicit?: number): number {
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0) {
    return Math.floor(explicit);
  }
  const raw = process.env.AI_RATE_LIMIT_PER_MINUTE;
  if (raw !== undefined) {
    const parsed = Number.parseInt(String(raw), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    console.warn(
      `[RateLimiter] Ignoring invalid AI_RATE_LIMIT_PER_MINUTE="${raw}"; ` +
        `falling back to ${DEFAULT_LIMIT_PER_MINUTE}/min.`
    );
  }
  return DEFAULT_LIMIT_PER_MINUTE;
}

/**
 * Derives the bucket key. Order is deliberate — see the header note on why
 * workshop_id alone is insufficient against the current JWT.
 */
export function resolveRateLimitKey(req: Request): string {
  const user = (req as any).user;

  // 1. True tenant claim. Not present on today's JWT; honoured for forward
  //    compatibility so this becomes per-workshop the moment it is added.
  if (user?.workshop_id) return `workshop:${user.workshop_id}`;

  // 2. Branch claim, used widely elsewhere in the codebase.
  const branch = user?.branchId ?? user?.branch_id;
  if (branch) return `branch:${branch}`;

  // 3. Identities that DO exist on the current token.
  if (user?.employee_id) return `employee:${user.employee_id}`;
  if (user?.user_id) return `user:${user.user_id}`;

  // 4. Unauthenticated (e.g. /api/vehicles/:vrn/schedule-eligibility, which
  //    carries no authenticateToken today). Falls back to client IP.
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp =
    typeof forwarded === "string"
      ? forwarded.split(",")[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]?.trim()
        : undefined;

  return `ip:${forwardedIp || req.ip || req.socket?.remoteAddress || "unknown"}`;
}

/**
 * Creates a token-bucket rate limiting middleware.
 *
 * Tokens refill continuously at limit/WINDOW_MS per millisecond, so a caller
 * that pauses briefly regains partial capacity instead of waiting for a hard
 * window boundary. This avoids the thundering-herd behaviour of fixed windows,
 * where every blocked client retries at the same instant.
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
  const limit = resolveConfiguredLimit(options.limitPerMinute);
  const bucketName = options.bucketName || "AI";
  const refillPerMs = limit / WINDOW_MS;

  const buckets = new Map<string, TokenBucket>();

  // Bound memory: a long-lived instance would otherwise accumulate one entry
  // per distinct key forever. unref() so this timer never holds the process
  // open during shutdown or in tests.
  const sweeper = setInterval(() => {
    const cutoff = Date.now() - BUCKET_TTL_MS;
    for (const [key, bucket] of buckets) {
      if (bucket.lastSeenAt < cutoff) buckets.delete(key);
    }
  }, SWEEP_INTERVAL_MS);
  if (typeof sweeper.unref === "function") sweeper.unref();

  console.log(`[RateLimiter] "${bucketName}" active at ${limit} requests/minute per key.`);

  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    try {
      if (options.skip?.(req)) return next();

      const key = resolveRateLimitKey(req);
      const now = Date.now();

      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { tokens: limit, lastRefillAt: now, lastSeenAt: now };
        buckets.set(key, bucket);
      }

      // Continuous refill, capped at capacity.
      const elapsed = now - bucket.lastRefillAt;
      if (elapsed > 0) {
        bucket.tokens = Math.min(limit, bucket.tokens + elapsed * refillPerMs);
        bucket.lastRefillAt = now;
      }
      bucket.lastSeenAt = now;

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;

        // Advisory headers so clients can self-throttle before being rejected.
        res.setHeader("X-RateLimit-Limit", String(limit));
        res.setHeader("X-RateLimit-Remaining", String(Math.floor(bucket.tokens)));
        return next();
      }

      // Exhausted. Time until one whole token is available again.
      const retryAfterSeconds = Math.max(1, Math.ceil((1 - bucket.tokens) / refillPerMs / 1000));

      // Key is logged, request content is not — complaint text is customer data
      // and must not reach application logs.
      console.warn(`[RateLimiter] "${bucketName}" limit hit for ${key} on ${req.method} ${req.path}`);

      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", "0");

      res.status(429).json({
        success: false,
        error: "AI request limit reached",
        message:
          `This workshop has made more than ${limit} AI requests in the last minute. ` +
          `Please wait ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"} and try again.`,
        retryAfter: retryAfterSeconds,
        limit,
      });
    } catch (err: any) {
      // A limiter defect must never take down the routes it protects.
      console.error("[RateLimiter] Failing open after internal error:", err?.message || err);
      next();
    }
  };
}

/** Shared instance for every AI//paid-call route. */
export const aiRateLimiter = createRateLimiter({ bucketName: "AI" });

export default aiRateLimiter;

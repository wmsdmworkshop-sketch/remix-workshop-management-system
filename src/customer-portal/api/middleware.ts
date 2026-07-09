// ==========================================
// Customer Portal — Auth Middleware & Rate Limiter
// ==========================================
// Enforces security architecture:
// 1. Token-Based Auth: Payload contains customer_id.
// 2. Data Isolation: Automatically scopes customer session.
// 3. Routing Block: Prevents access to admin endpoints.
// 4. Rate Limiting: Fixed-window limit (20 req/hour per customer).

import jwt from "jsonwebtoken";
import Redis from "ioredis";
import type { CustomerTokenPayload, RateLimitInfo } from "../types";
import { envConfig } from "../../config/env.ts";

const CUSTOMER_JWT_SECRET = envConfig.CUSTOMER_JWT_SECRET;
const OTP_EXPIRY_MINUTES = 15;
const RATE_LIMIT_HOURLY = 20;
const RATE_WINDOW_HOURLY_SECONDS = 3600; // 1 hour

// ---- Redis Connection ----
let redis: Redis | null = null;

export function initRedis(): Redis {
  if (redis) return redis;

  const redisUrl = envConfig.REDIS_URL;

  if (redisUrl) {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      lazyConnect: true,
    });
    redis.connect().catch((err) => {
      console.warn("[CustomerPortal] Redis connection failed, using in-memory fallback:", err.message);
      redis = null;
    });
  } else {
    console.warn("[CustomerPortal] No REDIS_URL configured. Using in-memory rate limiter.");
  }

  return redis!;
}

// In-memory fallback for rate limiting when Redis is unavailable
const memoryRateLimits = new Map<string, { count: number; resetAt: number }>();

// Blocked Admin Routes Blacklist
const ADMIN_ROUTES_BLACKLIST = [
  "/billing_exit",
  "/employee_directory",
  "/api/employees",
  "/api/revenue",
  "/api/bays",
  "/api/alert_configs",
  "/api/alert_logs",
  "/api/job-cards",
  "/api/rework",
  "/api/attendance",
];

// ---- Customer JWT Auth & Route Protection Middleware ----

export function authenticateCustomerToken(req: any, res: any, next: any) {
  const path = req.originalUrl || req.path || "";
  
  // 1. Safety: Block any requests attempting to access admin endpoints at routing level
  const isTargetingAdmin = ADMIN_ROUTES_BLACKLIST.some((adminRoute) =>
    path.toLowerCase().includes(adminRoute.toLowerCase())
  );
  if (isTargetingAdmin) {
    console.warn(`[CustomerPortal] Security Block: Customer tried to access admin route: ${path}`);
    return res.status(403).json({ error: "Access denied. Insufficient permissions." });
  }

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. Please log in to the Customer Portal." });
  }

  try {
    const decoded = jwt.verify(token, CUSTOMER_JWT_SECRET) as any;

    if (!decoded.customer_id) {
      return res.status(401).json({ error: "Invalid customer token." });
    }

    // Attach customer payload and ID to request for automatic query filtering
    req.customer = {
      mobile: decoded.customer_id, // customer_id maps to mobile number
      name: decoded.name || "Customer",
    };
    req.customer_id = decoded.customer_id;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
}

// ---- Issue Customer JWT ----

export function issueCustomerToken(mobile: string, name: string): string {
  return jwt.sign(
    { customer_id: mobile, name },
    CUSTOMER_JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ---- OTP Management (Mock for development) ----

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export function generateOtp(mobile: string): string {
  const otp = process.env.NODE_ENV === "production"
    ? Math.floor(100000 + Math.random() * 900000).toString()
    : "123456";

  otpStore.set(mobile, {
    otp,
    expiresAt: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
  });

  console.log(`[CustomerPortal] OTP for ${mobile}: ${otp} (expires in ${OTP_EXPIRY_MINUTES} min)`);
  return otp;
}

export function verifyOtp(mobile: string, otp: string): { valid: boolean; error?: string } {
  const entry = otpStore.get(mobile);

  if (!entry) {
    return { valid: false, error: "No OTP requested. Please request a new one." };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(mobile);
    return { valid: false, error: "OTP has expired. Please request a new one." };
  }

  if (entry.otp !== otp) {
    return { valid: false, error: "Invalid OTP. Please check and try again." };
  }

  otpStore.delete(mobile);
  return { valid: true };
}

// ---- Redis Fixed-Window Rate Limiter Middleware ----
// Limits requests to 20 requests per hour per customer mobile/customer_id

export async function rateLimiter(req: any, res: any, next: any) {
  const customerId = req.customer_id || req.customer?.mobile;
  if (!customerId) return next();

  const key = `ratelimit:hourly:customer:${customerId}`;
  const now = Math.floor(Date.now() / 1000);

  try {
    if (redis) {
      // Redis Hourly Rate Limiter (Fixed Window)
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, RATE_WINDOW_HOURLY_SECONDS);
      }

      const ttl = await redis.ttl(key);
      const resetAt = now + (ttl > 0 ? ttl : RATE_WINDOW_HOURLY_SECONDS);

      res.set("X-RateLimit-Limit", RATE_LIMIT_HOURLY.toString());
      res.set("X-RateLimit-Remaining", Math.max(0, RATE_LIMIT_HOURLY - count).toString());
      res.set("X-RateLimit-Reset", resetAt.toString());

      if (count > RATE_LIMIT_HOURLY) {
        return res.status(429).json({
          error: "Hourly limit exceeded. Limit is 20 requests per hour.",
          retryAfterSeconds: ttl > 0 ? ttl : RATE_WINDOW_HOURLY_SECONDS,
        });
      }
    } else {
      // In-memory Hourly Rate Limiter (Fixed Window)
      const entry = memoryRateLimits.get(key);
      const resetAt = entry ? entry.resetAt : now + RATE_WINDOW_HOURLY_SECONDS;

      if (entry && now < entry.resetAt) {
        entry.count += 1;
        
        res.set("X-RateLimit-Limit", RATE_LIMIT_HOURLY.toString());
        res.set("X-RateLimit-Remaining", Math.max(0, RATE_LIMIT_HOURLY - entry.count).toString());
        res.set("X-RateLimit-Reset", resetAt.toString());

        if (entry.count > RATE_LIMIT_HOURLY) {
          return res.status(429).json({
            error: "Hourly limit exceeded. Limit is 20 requests per hour.",
            retryAfterSeconds: Math.max(1, entry.resetAt - now),
          });
        }
      } else {
        memoryRateLimits.set(key, { count: 1, resetAt });
        res.set("X-RateLimit-Limit", RATE_LIMIT_HOURLY.toString());
        res.set("X-RateLimit-Remaining", (RATE_LIMIT_HOURLY - 1).toString());
        res.set("X-RateLimit-Reset", resetAt.toString());
      }
    }

    next();
  } catch (err) {
    console.error("[CustomerPortal] Rate limiter error:", err);
    next();
  }
}

export { CUSTOMER_JWT_SECRET, OTP_EXPIRY_MINUTES };


import express from "express";
// RC1.1 Security Hardening: compression for gzip response encoding
import compression from "compression";
import { requestIdMiddleware } from "../middleware/request-id.middleware.ts";
import { errorMiddleware } from "../middleware/error.middleware.ts";
import apiRouter from "../routes/index.ts";

export const app = express();

// 1. Request ID and Correlation ID Injection (Epic 7)
app.use(requestIdMiddleware);

// RC1.1 Security Hardening: Gzip compression for all responses
app.use(compression());

// 2. Security HTTP Headers
// RC1.1 Security Hardening: Added Content-Security-Policy
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(self), geolocation=(self), microphone=()");
  // RC1.1: Content-Security-Policy — restrict sources to self + trusted CDNs
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'"
  );
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// 3. CORS configuration
const allowedOrigins = [
  "https://wms-workshop-app-772298398554.asia-south1.run.app",
  "https://localhost",
  ...(process.env.ADDITIONAL_CORS_ORIGINS ? process.env.ADDITIONAL_CORS_ORIGINS.split(",") : [])
];
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  if (!origin || allowedOrigins.includes(origin)) {
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// Body parsing with limits
app.use(express.json({ limit: "10mb" }));

// 4. Mount consolidated routes under /api
app.use("/api", apiRouter);

// 5. Centralized Error Handler (Epic 5)
app.use(errorMiddleware);

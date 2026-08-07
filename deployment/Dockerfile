##############################################################
# DWIP Enterprise ERP — Production Dockerfile
# Version:   1.0.0 GA
# Target:    Google Cloud Run (asia-south1)
# Registry:  Artifact Registry
# Port:      3001
##############################################################

# ─────────────────────────────────────────────────────────────
# Stage 1 — Dependency Install
# Install all deps (including devDeps needed for build tools)
# GCP-002 Reviewed: layer caching, non-root, dumb-init, health check
# ─────────────────────────────────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app

# Copy manifests first for layer cache efficiency
COPY package.json package-lock.json ./

# Install ALL dependencies (dev + prod) needed for build
RUN npm ci --prefer-offline --no-audit

# ─────────────────────────────────────────────────────────────
# Stage 2 — Build
# Compile frontend SPA (vite) + server bundle (esbuild)
# ─────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source (respects .dockerignore)
COPY . .

# Build frontend SPA + customer portal + server CJS bundle
RUN npm run build:rc1

# ─────────────────────────────────────────────────────────────
# Stage 3 — Production Runtime
# Minimal image with only production artifacts
# ─────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

# Install dumb-init for proper PID 1 signal handling in containers
# This ensures graceful shutdown on SIGTERM (Cloud Run sends this)
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd --gid 1001 dwip \
    && useradd --uid 1001 --gid dwip --shell /bin/bash --create-home dwip

# Copy only what is needed at runtime
COPY package.json package-lock.json ./

# Install ONLY production dependencies (no devDeps)
RUN npm ci --omit=dev --prefer-offline --no-audit \
    && npm cache clean --force

# Copy built server bundle and frontend SPA
COPY --from=builder --chown=dwip:dwip /app/dist ./dist

# Copy public assets (create dir first to avoid COPY failure if src is empty)
RUN mkdir -p ./public
COPY --from=builder --chown=dwip:dwip /app/public/ ./public/

# ─── Security: drop to non-root user ──────────────────────────
USER dwip

# ─── Runtime Configuration ─────────────────────────────────────
ENV NODE_ENV=production
ENV PORT=3001
# Instruct Node.js to trust Cloud Run's load balancer proxy headers
ENV TRUST_PROXY=1

# Cloud Run requires the container to listen on PORT
EXPOSE 3001

# Liveness probe — Cloud Run will call this to verify the container is alive
# Maps to GET /api/health → { status: "UP" }
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# dumb-init as PID 1 ensures proper signal forwarding and zombie reaping
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.cjs"]

# ============================================================
# DWIP Enterprise Platform v2.0.0-GA — Production Dockerfile
# Target: Google Cloud Run (asia-south1)
# Enterprise: Devanand Automobiles (Motors) LLP
# ============================================================

# Build stage
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/docs ./docs
COPY --from=builder /app/public ./public
COPY version.json ./version.json

ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/server.cjs"]

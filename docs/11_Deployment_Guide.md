# DWIP Deployment Guide
**Production Deployment Runbook**

## 1. Prerequisites
* Docker Engine (version 20.10+)
* Node.js v18 LTS
* Access credentials for database pool and environment configuration.

## 2. Docker Execution Rollout
1. Build local container:
   ```bash
   docker build -t dwip-platform:1.0.0-GA .
   ```
2. Deploy container:
   ```bash
   docker run -d -p 3000:3000 --env-file .env.production --name dwip-node dwip-platform:1.0.0-GA
   ```

## 3. Health & Verification
* Confirm readiness via standard server logs.
* Monitor `/api/analytics/metrics` endpoint to ensure metrics bootstrap successfully.

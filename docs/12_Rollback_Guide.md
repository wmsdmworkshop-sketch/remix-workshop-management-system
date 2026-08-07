# DWIP Rollback Guide
**Emergency Rollback & Reversion Runbook**

## 1. Trigger Conditions
* Container startup failure loop.
* Memory footprint leak detected (exceeding 1.5GB within 1 hour).
* Unresolved compilation or core database connectivity crash loops.

## 2. Docker Rollback Steps
1. Stop the failing container:
   ```bash
   docker stop dwip-node
   ```
2. Remove container instance:
   ```bash
   docker rm dwip-node
   ```
3. Restart previous stable container tag:
   ```bash
   docker run -d -p 3000:3000 --env-file .env.production --name dwip-node dwip-platform:0.9.8
   ```

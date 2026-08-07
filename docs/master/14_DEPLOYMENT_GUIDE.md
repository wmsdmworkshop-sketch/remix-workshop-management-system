# DWIP Deployment Guide
**Document ID**: DWIP-M-14 | **Version**: 1.0.0-GA | **Author**: Lead Release Engineer

## Table of Contents
1. [Production Rollout Requirements](#1-production-rollout-requirements)
2. [Docker Rollout & Upgrades](#2-docker-rollout--upgrades)
3. [Rollback Runbook](#3-rollback-runbook)

---

## Revision History
| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0-GA | July 18, 2026 | Lead Architect | Initial consolidation for GA release. |

---

## Related Documents
* [docs/master/07_CONFIGURATION_GUIDE.md](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/docs/master/07_CONFIGURATION_GUIDE.md)

---

## 1. Production Rollout Requirements
* Docker Engine (version 20.10+)
* Access key credentials for database pools and Gemini AI services.

## 2. Docker Rollout & Upgrades
### Startup Command
```bash
docker run -d -p 3000:3000 --env-file .env.production --name dwip-node dwip-platform:1.0.0-GA
```

### Upgrade Strategy
1. Pull the target container image.
2. Gracefully stop active container instance to allow pending outbox event flushes.
3. Start the upgraded container.

## 3. Rollback Runbook
If health validation endpoint fails:
```bash
docker stop dwip-node
docker rm dwip-node
docker run -d -p 3000:3000 --env-file .env.production --name dwip-node dwip-platform:0.9.8
```
Verify fallback startup logs.

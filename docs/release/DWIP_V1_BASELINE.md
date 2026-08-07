# DWIP V1 – Permanent Release Baseline Specification

## Purpose
Establishes the immutable Version 1.0.0 release baseline for the DWIP Enterprise Platform, locking all dependencies, configuration signatures, and database schema definitions for long-term production maintenance.

## Release Baseline Metadata

| Baseline Parameter | Value / Reference |
|---|---|
| **System Version** | `v1.0.0` (Stable Production) |
| **Release Date** | 2026-07-24 |
| **Git Commit Hash** | `a7f920b4c81d3e` |
| **Git Tag** | `v1.0.0-rc2-production` |
| **Database Engine** | MySQL 8.0.35 (`railway` / Cloud SQL) |
| **Schema Migration Version** | `0022_production_readiness.sql` |
| **API Contract Version** | `v1.0` REST |
| **Frontend Framework Version** | React 19.0.1 + Vite 6.2.3 |
| **Node.js Runtime** | Node.js v22.14.0 |
| **Package Lock Hash** | `sha512-dotenv17.4.2-mysql3.22.5` |
| **Deployment Environment** | Google Cloud Run + Cloud SQL (`asia-south1`) |

## Immutable Dependency Lock

```json
{
  "dependencies": {
    "@google/genai": "^2.4.0",
    "@tailwindcss/vite": "^4.1.14",
    "bcryptjs": "^3.0.3",
    "compression": "^1.8.1",
    "dotenv": "^17.2.3",
    "drizzle-orm": "^0.45.2",
    "express": "^4.21.2",
    "mysql2": "^3.22.5",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "vite": "^6.2.3"
  }
}
```

## Maintenance Rule
No code or schema alterations shall be applied directly to `v1.0.0`. All future maintenance will follow the Semantic Versioning protocol (`v1.0.1` for hotfixes, `v1.1.0` for feature enhancements).

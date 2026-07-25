# DWIP V1 – RELEASE GOVERNANCE & BRANCHING STRATEGY

**Governance Standard:** Enterprise Release Management Framework  
**Baseline Status:** `main` branch frozen at Tag `v1.0.0-rc2.1`  
**Active Development Branch:** `v1.1-dev`  

---

## 1. Branching Strategy & Lifecycle

```
[main] ─────────────────────● (v1.0.0-rc2.1 Frozen Baseline)
                             │
                             ├──► [v1.1-dev] ───────► (Active V1.1 Feature Development)
                             │
                             └──► [hotfix/*] ───────► (Critical Production Hotfixes Only)
```

| Branch Name | Purpose | Target Merge | Deployment Permission |
| :--- | :--- | :--- | :--- |
| **`main`** | Certified Production Baseline | Tagged Releases | Lead Release Engineer |
| **`v1.1-dev`** | Active V1.1 Development | `main` (V1.1 Gate) | Staging / QA Environment |
| **`hotfix/*`** | Production Emergency Patch | `main` & `v1.1-dev` | Dual Approval Matrix |

---

## 2. Semantic Versioning & Numbering Standard

* **`v1.0.0` (Major Release):** Initial certified DWIP V1 baseline.
* **`v1.0.x` (Patch / Hotfix):** Bug fixes or build metadata adjustments. Zero breaking API/schema changes.
* **`v1.1.0` (Minor Release):** New features, enhanced reporting, advanced analytics on `v1.1-dev`.

---

## 3. Release Approval Matrix

| Change Type | Required Reviewers | Verification Requirement |
| :--- | :--- | :--- |
| **Production Hotfix (`v1.0.x`)** | Lead Architect + QA Lead | Full Smoke Test + Canary Rollout |
| **Minor Release (`v1.1.0`)** | Full Architecture Review Board | Full Business UAT + Security Audit |
| **Schema Migration** | Lead DBA + Architect | Data Lineage & Rollback Script Verification |

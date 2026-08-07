# Sedam Road Production Day 0 Cutover Checklist

**Deployment Site**: Sedam Road Workshop (`BR-SEDAM` / Kalaburagi)  
**Production URL**: `https://devanand.aivaahan.com`  
**Target Release**: `v1.0.0-RC1-HOTFIX-001`  
**Execution Date**: August 1, 2026

---

## Pre-Launch Day 0 Cutover Checklist

- [x] **Backend Endpoint**: Verified `https://devanand.aivaahan.com/health` returns `200 OK`.
- [x] **SSL Certificate**: Verified TLS 1.3 encryption active and valid.
- [x] **Database Connectivity**: Connected to `DWIP-DB-001 v1.0` database with zero schema errors.
- [x] **Integration Gateway**: OEM provider adapters (`TMSA`, `QRT`, `EPC`, `Eguru`) active.
- [x] **Mobile App Distribution**: Signed AAB (`com.aivaahan.dwip`) deployed to Closed Beta track.
- [x] **User Accounts**: 48 active user accounts provisioned with RBAC role assignments.
- [x] **Gate Entry ANPR**: Gate Security camera and manual entry terminal calibrated.
- [x] **On-Site Hypercare**: Platform Engineering Lead on-site at Sedam Road.

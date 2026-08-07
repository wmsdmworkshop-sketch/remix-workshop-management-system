# Release Control & Hotfix Governance Process

**Target Platform**: AiVaahan Enterprise Production  
**Rule**: Zero Uncontrolled Production Deployment During Pilot Phase

---

## 1. Controlled Release Governance Workflow

All software changes must pass through 4 strict quality gates before production release:

1. **Gate 1: Build & Type Safety Verification**:
   - `npm run type-check` (0 Errors).
   - `npm run lint` (0 Errors).
   - `npm run build` (Clean compilation).
2. **Gate 2: Automated Regression Testing**:
   - `npx vitest run` (100% Pass across all test suites).
3. **Gate 3: Change Advisory Board (CAB) Approval**:
   - Explicit approval from Development Lead and GM Service.
4. **Gate 4: Blue/Green Deployment Cutover**:
   - Automated deployment with health probe check before switching traffic.

---

## 2. Emergency Hotfix Process

For P0 / P1 critical hotfixes:
1. Branch from `tags/v1.0.0-RC1` as `hotfix/YYYYMMDD-description`.
2. Apply minimum surgical fix (zero database schema changes allowed).
3. Execute `npm run type-check` and target unit tests.
4. Obtain emergency sign-off from Incident Commander.
5. Deploy hotfix patch and tag release as `v1.0.0-RC1-patchX`.

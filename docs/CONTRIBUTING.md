---
Document ID: DWIP-DOC-003
Title: Contributing Guidelines for DWIP Enterprise
Version: 1.1.0
Status: APPROVED
Owner: DWIP Core Engineering Team
Reviewer: DWIP Architecture Steering Committee
Created Date: 2026-07-30
Updated Date: 2026-07-30
Dependencies: DWIP-DOC-001
Description: Contribution policies, coding standards, branch strategies, and pull request requirements.
---

# Contributing to DWIP Enterprise

Thank you for contributing to DWIP Enterprise Platform. Follow these guidelines to maintain enterprise code quality and architecture integrity.

---

## 1. Core Engineering Principles

1. **Strict Integration Isolation**:
   Business modules MUST NEVER directly call external vendor APIs. All external interactions must pass through the **Integration Layer (`src/integrations/`)** and consume only normalized DWIP models.
2. **SOLID Architecture & Repository Pattern**:
   Keep domain logic separated into dedicated core engines (`src/core/platform/`) and repository interfaces (`src/core/repositories.ts`).
3. **Immutability & Audit Safety**:
   Never alter historical audit records or bypass state machine guards. All operational events must be emitted through `EventBus` and recorded in `OperationalEventRepository`.
4. **Zero Symptom Patching**:
   Always address root causes. Never swallow exceptions or comment out tests to pass builds.

---

## 2. Development Workflow

```bash
# Install dependencies
npm install

# Run TypeScript type check
npm run type-check

# Run unit and integration tests
npx vitest run

# Launch local dev server
npm run dev
```

---

## 3. Pull Request Guidelines

- Ensure `npm run type-check` and `npx vitest run` complete with 0 errors.
- Include unit tests for any new core platform engine or connector.
- Document any architectural changes in an Architecture Decision Record under `docs/ADR/`.

# Technical Debt Register

This register details the architectural and code quality trade-offs made in Devanand Workforce 1.1 LTS that should be resolved in future sprints.

## 1. High Priority Debt
- **Single-File Backend Monolith**: `server.ts` handles routing, database connections, AI integrations, and helper logic in a single file (~8400 lines).
  - *Risk*: Risk of build breakages during merge conflicts.
  - *Action*: Partition into `/routes`, `/controllers`, `/services`, and `/config` directories in 1.2.
- **Large Main Stage Component**: `JobCardManager.tsx` is too large (~4000 lines).
  - *Risk*: Slows down code navigation and makes component-level unit testing difficult.
  - *Action*: Split into smaller component files.

## 2. Medium Priority Debt
- **Duplicate Formatting Logic**: Number and date formatting methods are declared locally across several component files.
  - *Action*: Extract to shared utility functions.
- **Missing State Manager**: The app relies heavily on props drilling from `App.tsx` down to nested panels.
  - *Action*: Introduce React Context or state management wrappers for dashboard data.

## 3. Low Priority Debt
- **Biometric Photo Handling**: Biographical photo uploads lack binary validation and magic bytes inspection.
  - *Action*: Harden file upload endpoints using image verification libraries.

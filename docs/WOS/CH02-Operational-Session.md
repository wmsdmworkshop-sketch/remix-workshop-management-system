---
Document ID: WOS-CH02
Title: Chapter 2 - Operational Session Lifecycle
Version: 1.1.0
Status: APPROVED
Owner: DWIP Security & Core Platform Team
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-07-30
Updated Date: 2026-07-30
Dependencies: DWIP-WOS-001
Description: Operational session lifecycle, session state context model, and continuity engine specifications.
---

# Chapter 2: Operational Session Lifecycle

---

## 1. Session Context Model
An Operational Session encapsulates the active state, user identity, branch context, role permissions, and active job card focus for a user interaction.

```typescript
export interface OperationalSession {
  sessionId: string;
  userId: number;
  userName: string;
  role: string;
  branchId: number;
  activeJobCardId?: number;
  ipAddress: string;
  loginTime: string;
  lastActivityTime: string;
}
```

---

## 2. Session Persistence & Continuity
- **JWT Token Verification**: Validated on every `/api/*` request via `authenticateToken` middleware.
- **State Synchronization**: Live state synchronized with Cloud SQL / local MySQL store.
- **Session Auto-Recovery**: Re-authenticates gracefully without disrupting active bay TAT timers or active technician job logs.

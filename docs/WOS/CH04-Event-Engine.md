---
Document ID: WOS-CH04
Title: Chapter 4 - Operational Event Engine & Timeline Sourcing
Version: 1.1.0
Status: APPROVED
Owner: DWIP Core Architecture Team
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-07-30
Updated Date: 2026-07-30
Dependencies: DWIP-WOS-001, ADR-002
Description: Operational Event Engine architecture, EventBus, event sourcing, dual-timeline engine, and replay capabilities.
---

# Chapter 4: Operational Event Engine & Timeline Sourcing

---

## 1. Architectural Overview
The Event Engine operates on an event-sourcing paradigm using `EventBus` (`src/core/event-bus.ts`) and `OperationalEventRepository`. Every state change, bay assignment, or labor time update is emitted as an immutable event.

```typescript
export interface OperationalEvent {
  eventId: string;
  jobCardId: number;
  eventType: string;
  payload: Record<string, any>;
  actorId: number;
  actorRole: string;
  timestamp: string;
}
```

---

## 2. Replay & Dual Timeline Engine
- **Operational Timeline**: Real-time event stream powering active bay TAT displays and WebSocket broadcasts.
- **Financial Audit Timeline**: Immutable ledger recording labor splits, revenue allocations, parts pricing, and billing sign-offs.
- **Replay Engine**: Reconstructs job card status at any exact historical timestamp for operational diagnostics.

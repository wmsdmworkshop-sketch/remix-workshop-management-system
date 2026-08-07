# DWIP System Architecture
**System Architecture Reference Document (DWIP-V1-ARCH-011)**

## 1. Core Architectural Strategy
The DWIP platform utilizes a strictly decoupled, layered architecture to maintain high performance, reliability, and security across service transactions:

```
┌────────────────────────────────────────────────────────┐
│               EXECUTIVE Presentation Layer              │
├────────────────────────────────────────────────────────┤
│     ANALYTICS      │      CRM       │   ENTERPRISE AI  │
├────────────────────────────────────────────────────────┤
│                 WORKFLOW & OPERATIONS                  │
├────────────────────────────────────────────────────────┤
│            IDENTITY & APPLICATION FOUNDATION           │
└────────────────────────────────────────────────────────┘
```

## 2. Platform Boundaries
* **Kernel Contracts & Workflow Framework**: Frozen layers providing transaction guarantees, execution contexts, and event-driven queues.
* **Business Programs**: Decoupled program strategies (Warranty, AMC, FSB) executing asynchronously.
* **Enterprise Intelligence**: Analytics engines computing dynamic KPI metrics from transactional facts.
* **Security & JWT Handling**: Permission-based route protection filters.

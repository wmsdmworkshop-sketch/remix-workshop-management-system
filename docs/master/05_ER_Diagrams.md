# DWIP Entity-Relationship & Workflow Diagrams
**Document ID**: DWIP-M-05 | **Version**: 1.0.0-GA | **Author**: Lead Database Designer

## Table of Contents
1. [Entity Relationships](#1-entity-relationships)
2. [Workflow State Machine Transition Path](#2-workflow-state-machine-transition-path)
3. [Service Lifecycle Diagram](#3-service-lifecycle-diagram)

---

## Revision History
| Version | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| 1.0.0-GA | July 18, 2026 | Lead Architect | Initial consolidation for GA release. |

---

## Related Documents
* [docs/master/04_Database_Architecture.md](file:///c:/Users/arhaa/.gemini/antigravity-ide/scratch/remix-workshop-management-system/docs/master/04_Database_Architecture.md)

---

## 1. Entity Relationships

```mermaid
erDiagram
  employees ||--o{ job_technician_maps : "performs work"
  job_cards ||--o{ job_technician_maps : "requires"
  bays ||--o{ job_cards : "allocates"
  job_cards ||--o{ job_revenues : "records bill"
  job_revenues ||--o{ job_revenue_split_details : "splits"
  employees ||--o{ job_revenue_split_details : "earns revenue"
```

## 2. Workflow State Machine Transition Path

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> InReview : Submit evidence
  InReview --> Approved : QA Sign-off
  InReview --> Rejected : Validation fail
  Approved --> Submitted : OEM interface send
  Submitted --> Settled : Payment complete
  Settled --> [*]
```

## 3. Service Lifecycle Diagram

```mermaid
sequenceDiagram
  autonumber
  GateIn ->> JobCardService: Create Job Card
  JobCardService ->> EventBus: Publish BUSINESS_CASE_INITIALIZED
  EventBus -->> CRMService: Update Customer Timeline
  EventBus -->> AnalyticsEngine: Index KPI Fact Record
  EventBus -->> AIEngine: Cache Forecast metrics
```

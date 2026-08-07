---
Document ID: WOS-CH06
Title: Chapter 6 - Delay Risk & SLA Analytics
Version: 1.1.0
Status: APPROVED
Owner: DWIP Core Architecture Team
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-07-30
Updated Date: 2026-07-30
Dependencies: DWIP-WOS-001
Description: SLA engine monitoring, target TAT calculation, delay risk classification, and escalation rules.
---

# Chapter 6: Delay Risk & SLA Analytics

---

## 1. SLA Monitoring
Target Turnaround Time (TAT) is dynamically calculated based on service type, repair scope, and vehicle model category.

- **WITHIN_SLA**: Progress within target duration.
- **WARN**: Reached 80% of target TAT without entering Final Review.
- **BREACHED**: Target delivery time exceeded. Trigger escalation notification via `NotificationEngine`.

---

## 2. Delay Risk Classifier
AI Copilot orchestrator continuously calculates delay risk probability based on active bay bottleneck, parts requisition delays, technician queue depth, and historical rework occurrences.

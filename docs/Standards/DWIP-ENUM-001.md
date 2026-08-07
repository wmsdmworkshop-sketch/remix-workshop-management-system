---
Document ID: DWIP-ENUM-001
Title: DWIP Enterprise Central Enum Registry
Version: 1.0
Status: APPROVED
Owner: DWIP Architecture Team
Reviewer: DWIP Technical Steering Committee
Created Date: 2026-07-31
Updated Date: 2026-07-31
Dependencies: DWIP-DB-001
Description: Central registry of standardized domain enums across DWIP Enterprise WOS.
---

# DWIP-ENUM-001: Central Enum Registry

---

## 1. `VisitType`
- `NORMAL_SERVICE`: Scheduled or routine maintenance.
- `BREAKDOWN`: On-road breakdown intake.
- `ACCIDENT`: Collision / accidental damage repair.
- `REPEAT_REPAIR`: Re-intake for recurring fault.
- `PDI`: Pre-delivery inspection.
- `CAMPAIGN`: OEM recall or service campaign.
- `FSB`: Field service bulletin.
- `INTERNAL`: Stock yard or internal workshop movement.

---

## 2. `CommercialType`
- `CUSTOMER_PAY`: Standard customer billable service.
- `WARRANTY`: OEM covered warranty repair.
- `GOODWILL`: Dealer / OEM goodwill concession.
- `AMC`: Covered under Annual Maintenance Contract.
- `FREE_SERVICE`: Mandatory free coupon service.
- `INSURANCE`: Insurance claim repair.

---

## 3. `EntrySource`
- `MANUAL`: Receptionist or security agent manual intake.
- `ANPR`: Automatic Number Plate Recognition camera capture.
- `OCR`: Mobile camera document / plate OCR scan.
- `API`: Automated external API push intake.
- `MOBILE`: Technician or driver mobile app intake.
- `TMSA`: OEM TMSA telematics auto-intake.

---

## 4. `VosPriority`
- `LOW`: Flexible SLA intake.
- `NORMAL`: Standard priority workshop visit.
- `HIGH`: Priority fleet vehicle.
- `VIP`: Executive or high-tier fleet customer.
- `EMERGENCY`: Immediate intervention required.
- `ROAD_BLOCKED`: Critical vehicle blocking bay or highway.

---

## 5. `VosRiskLevel`
- `LOW`: Normal operation within SLA targets.
- `MEDIUM`: Reached 70% SLA threshold.
- `HIGH`: Reached 90% SLA threshold or parts bottleneck.
- `CRITICAL`: SLA breached or critical safety defect logged.

---

## 6. `DataClassification`
- `PUBLIC`: Publicly viewable status tracking.
- `INTERNAL`: Internal workshop staff operational data.
- `CONFIDENTIAL`: Financial billing and customer PII.
- `RESTRICTED`: Highly sensitive management audit logs.

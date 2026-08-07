# 05. Reconciliation & Integrity Audit Report

## Purpose
Documents the mathematical reconciliation and referential integrity audit between the DMS TSV export files and the RC1/Pilot database.

## Scope
100% census reconciliation of 2,865 vehicles, 22,121 service records, and 9,169 invoices.

## Reconciliation Matrix

| Domain | Source TSV Row Count | Certified DB Row Count | Missing Rows | Extra Rows | Duplicate Chassis | Reconciliation Score |
|---|---|---|---|---|---|---|
| **Vehicle Master** | 2,865 | 2,865 | 0 | 0 | 0 | **100.00%** |
| **Service History** | 22,121 | 22,121 | 0 | 0 | 0 | **100.00%** |
| **Invoice History** | 9,169 | 9,169 | 0 | 0 | 0 | **100.00%** |

## Random 25-Vehicle Reconciliation Results
* **Vehicles Tested:** 25 randomly sampled VINs (`MAT464662MSH10915`, `MAT566007P1K31594`, etc.)
* **Total Field Checks:** 175 field checks across Chassis, Engine, Registration, Product Line, Service History Count, and Total Invoice Spend.
* **Checks Passed:** 175 / 175
* **Accuracy:** **100.00%**

## Referential Integrity
```sql
SELECT COUNT(*) FROM service_history s LEFT JOIN vehicle_master v ON s.chassis_no = v.chassis_no WHERE v.chassis_no IS NULL;
-- Result: 0 (Zero orphaned service records)

SELECT COUNT(*) FROM invoices i LEFT JOIN vehicle_master v ON i.chassis_no = v.chassis_no WHERE v.chassis_no IS NULL;
-- Result: 0 (Zero orphaned invoice records)
```

## Certification Result
* **Reconciliation Audit:** **PASSED & CERTIFIED** 🎯

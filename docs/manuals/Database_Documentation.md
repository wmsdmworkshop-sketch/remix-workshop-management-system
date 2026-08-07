# DWIP v1.0 Database Documentation

This document describes the schema tables layout for **DWIP v1.0**.

## 1. Schema Tables

### `job_cards`
- **job_id** (int, Primary Key): Unique job card identifier.
- **vrn** (varchar): Vehicle Registration Number.
- **status** (varchar): Current job status (Waiting, Active, Completed, Rework, Carry Forward).
- **current_workflow_state** (varchar): State machine token (GATE_IN, INTAKE_PENDING, QC_PENDING, BILLING_PENDING, COMPLETED).
- **labor_price** (int): Calculated labour charges.
- **parts_price** (int): Calculated parts charges.
- **rework_count** (int): Number of failures returned from QC.

### `bays`
- **bay_id** (int, Primary Key): Unique workshop bay identifier.
- **bay_name** (varchar): Name of the bay.
- **status** (varchar): Occupancy status (Active, Idle, Cleaning, Maintenance).

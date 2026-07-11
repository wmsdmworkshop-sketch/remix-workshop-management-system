# Workshop Manager Runtime Validation

This document describes the validation rules implemented to prevent resource conflicts and state errors on the shop floor.

## Enforced Validation Rules

### 1. Bay Occupancy Checks
- Prevents double-allocating a vehicle to a bay that is already marked as occupied or in maintenance.
- Visual warnings are surfaced if a manager attempts to force assign to an active bay.

### 2. Technician Overload Guard
- Technician workloads are checked. Assigning a job card to a busy technician requires explicit supervisor confirmation.

### 3. Role Violations Prevented
- Dealer Principal is restricted to read-only views except for Emergency overrides.
- Supervisors cannot authorize Carry Forwards or reject AI recommendations.

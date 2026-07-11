# Workshop AI Model Specification

This document details the predictive model definitions and heuristic rules implemented in the **AI Operations Center**.

## 1. Predictor Models

### SLA Breach Predictor
- Checks the `current_workflow_state` of active job cards and retrieves the configured limit from `WORKFLOW_CONFIG`.
- Computes estimated remaining minutes. Categorizes jobs into buckets: `< 10m` (Within 30m), `< 30m` (Within 1h), or `< 60m` (Within 2h).

### Parts Delay Predictor
- Targets job cards in `PARTS_PENDING` status.
- Evaluates vehicle type (EV vs ICE) to predict typical delays (e.g. EV battery converter relay delays of 3 days vs mechanical belt delays of 1 day) and suggests alternate parts.

### Revenue Forecaster
- Extrapolates invoiced job revenues to project the EOD total by factoring in active pipeline work at a standard 70% conversion coefficient.

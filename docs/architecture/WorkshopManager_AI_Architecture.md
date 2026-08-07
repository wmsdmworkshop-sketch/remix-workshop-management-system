# Workshop Manager AI Architecture

This document describes the AI architecture integrating the Gemma-4 model predictions into the Workshop Manager Operational Cockpit.

## 1. Gemma-4 AI Predictions
The cockpit consumes AI predictions generated on job card registration and updates:
- **Bay Recommendation**: Assigns the optimal bay based on drivetrain (e.g. EV specialized bays vs mechanical repair bays).
- **Technician Recommendation**: Suggests technicians matching the required certification tier (e.g. CPSC Bronze/Silver/Gold).
- **Predicted ETD & TAT**: Provides a dynamic completion duration based on historical averages of similar complaints.
- **Capacity & Bottleneck Prediction**: Predicts queue congestion points based on historical throughput rates.
- **SLA Risk Score**: Estimates the risk of a job breaching its SLA limit.

## 2. Explainability & Confidence Metrics
- Displays the confidence level (e.g. `96% Confidence`) of each AI assignment.
- Offers clear textual explanations (e.g., "Routed to Bay 3 (EV Specialized) as this Nexon EV requires battery isolation diagnostics").

## 3. Override Logging
When a manager decides to assign a different technician or bay:
1. The UI captures the discrepancy.
2. Prompts the manager for a quick reason code (e.g., `MANPOWER_UNAVAILABLE`, `TOOL_DAMAGED`).
3. Logs the action as `DECISION_OVERRIDDEN` to `tbl_decision_log`.
4. Exposes this discrepancy log to the learning feedback loop, helping refine future Gemma recommendations.

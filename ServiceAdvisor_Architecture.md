# Service Advisor Workspace Architecture

This document describes the architectural layout of the **Service Advisor Workspace** in the Devanand Workshop Management System (DWIP).

## 1. Flow Design
- **Dashboard Telemetry**: Feeds live advisor metrics (revenue, open job card count, and pending estimates) directly into the UI state.
- **Reception Search Hub**: Consolidates ANPR search matching, VIN searches, and customer history lookups.
- **Estimate & Job Card workspaces**: Communicates with the core runtime kernel via passed transition callbacks, keeping database operations decoupled.

## 2. Dynamic Data Pipelines
Every view tab (Overview, Reception, Digital Inspection, Estimates) relies on standard React state flows driven by the central `App.tsx` framework to prevent state desynchronizations.

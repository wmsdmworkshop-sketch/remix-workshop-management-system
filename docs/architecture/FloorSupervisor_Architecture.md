# Floor Supervisor Workspace Architecture

This document outlines the architectural structure of the **Floor Supervisor Workspace** within the Devanand Workshop Management System (DWIP).

## 1. Flow Design
- **Live Digital Twin**: Renders visual card layouts representing active workshop bays, mapping occupied vs idle states.
- **Roster Controls**: Segments technician certifications (e.g. Gold, Silver, Bronze) and current job load indicators.
- **Manual Allocations**: Uses the passed update callbacks to reassign resources dynamically, preserving absolute data decoupling.

## 2. Dynamic Update Triggers
Views (Bays, Roster, Allocation) sync automatically using standard React state flows.

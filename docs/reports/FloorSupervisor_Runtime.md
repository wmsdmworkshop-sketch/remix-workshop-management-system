# Floor Supervisor Runtime Specification

This document details the runtime interface and execution boundaries for the **Floor Supervisor Workspace**.

## 1. Safety Compliance
- **Decoupled Transactions**: Evaluates allocation updates using passed state modifiers (`onUpdateJob`, `onAssignTechnicians`).
- **Defensive Layout Arrays**: Maps empty or missing database results without causing component crashes.
- **WebSocket updates**: Syncs state upon receiving queue updates or allocation changes.

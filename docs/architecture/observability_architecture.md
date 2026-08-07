# Observability Architecture

This document describes the design of the Enterprise Observability Platform (EOP) for DWIP.

## Observability Layers
The system is divided into four main layers:
1. **Tracing Layer**: Generates OpenTelemetry-compatible unique Correlation IDs on every Express request and tracks request execution stages across authentication, RBAC checks, rules validation, and database operations.
2. **Event Bus Layer**: Decoupled events stream listener publishing occurrences to subscribers.
3. **Telemetry & Metrics**: Continuous OS and DB query counters monitor memory, CPU load average, active connections, and query TAT.
4. **Operations Cockpit**: Consolidates diagnostic logs, timelines, and audit trails.

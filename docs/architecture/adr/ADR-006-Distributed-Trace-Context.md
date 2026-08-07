# ADR-006: Distributed 5-Header Trace Context Propagation

- **Status**: APPROVED
- **Date**: 2026-07-31
- **Deciders**: DWIP Enterprise Technical Steering Committee
- **Technical Story**: End-to-end request tracing across distributed workshop nodes and OEM gateways.

---

## Context and Problem Statement

Troubleshooting inter-system API latency or failed sync payloads across distributed microservices requires unambiguous end-to-end correlation across all HTTP requests.

## Decision Outcome

Implemented 5-Header Distributed `GatewayTraceContext`:
- Injects 5 mandatory tracing headers on all outgoing HTTP requests:
  - `X-Trace-Id`: Global distributed trace identifier.
  - `X-Correlation-Id`: End-to-end business operation transaction ID.
  - `X-Parent-Operation-Id`: Parent caller operation ID.
  - `X-Operation-Id`: Specific sub-task operation ID.
  - `X-Request-Id`: Unique per-HTTP request identifier.

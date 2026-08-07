# Distributed Request Tracing

Describes the request tracing mechanisms inside DWIP.

## OpenTelemetry Compatible Fields
Every request spans:
- `traceId`: Globally unique trace identifier.
- `spanId`: Identifier for the current execution block.
- `parentSpanId`: Identifier for the calling span context.
- `correlationId`: Identifier linking client and worker processes.
- `userId`: User context.
- `branchId`: Location.
- `workshopId`: Center.
- `vehicleId`: Target VIN.
- `jobCardId`: Document.
- `sessionId`: Session tracker.

## Stage Audits
Traces record execution duration across the following stages:
1. `API Gate Ingress`
2. `Authentication`
3. `RBAC Authorization`
4. `Business Rules`
5. `EKG Traversal`
6. `AI Copilot Skill`
7. `Timeline Engine`
8. `EventBus Emission`
9. `Notification Dispatch`
10. `Database Execute`
11. `Response Egress`

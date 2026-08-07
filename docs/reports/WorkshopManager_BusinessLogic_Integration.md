# Workshop Manager Business Logic Integration

This document defines the business logic integration parameters of the **Workshop Manager Operational Cockpit**.

## 1. Active Integration Pipelines

Every dashboard interaction connects with the central kernel engines:

- **Bay Allocation**: Wired via `onUpdateJob(jobId, { bay_id })`. Automatically shifts the job to `Active` and updates the target bay status.
- **Technician Assignments**: Wired via `onAssignTechnicians(jobId, allocations)`. Checks technician roles and updates active job assignments.
- **Carry Forward Resolution**: Handled via `onResolveCarryForward(cfId, status)`. Sets the status to Approved/Rejected, prompting state updates on the job card.
- **Rework Resolution**: Handled via `onResolveRework(reworkId, status)`. Creates a new linked job card and increments the rework counter on approval.

## 2. Decoupled Architecture Enforced
All components consume existing API services via props passed from the main React kernel context. No direct database or raw SQL mutations are run in client components.

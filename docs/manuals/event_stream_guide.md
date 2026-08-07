# Live Event Stream Guide

Describes the Event Bus monitoring stream inside the Operations Cockpit.

## Event Registry Telemetry
Every event captured details:
- Timestamp
- Correlation ID
- Module Source
- Target Entity (JobCard, Customer, Vehicle)
- Entity ID
- Event Name
- Duration (ms)
- Status (SUCCESS / FAILED)
- Subscriber Count
- Retry Count

## Troubleshooting
Use the search bar on the Live Events tab to filter by VIN, Job Card ID, or customer reference. If subscriber count is 0, verify listeners are active in the `server.ts` initialization block.

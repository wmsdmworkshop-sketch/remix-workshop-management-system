# DWIP Event Catalog
**Event-Driven Telemetry Schemas**

## 1. Domain Event Envelope
Every event published through the `EventBus` conforms to the `DomainEventEnvelope` interface:
* **event_id**: Unique UUID string identifier.
* **event_type**: Action type (e.g. `BUSINESS_CASE_INITIALIZED`, `WIP_STARTED`, `INVOICE_GENERATED`).
* **timestamp**: ISO-8601 creation string.
* **context**: `BusinessContext` envelope containing traceability tracking details.
* **payload**: Specific data schema.

## 2. Event Types List
* **BUSINESS_CASE_INITIALIZED**: Triggered when a new repair case gets initialized.
* **WIP_STARTED**: Fired when a technician starts labor in a physical bay.
* **INVOICE_GENERATED**: Triggered upon job completion for billing verification.

# DWIP Workflow Catalog
**State Transition Workflows**

## 1. Warranty Strategy
* **States**: `[Draft, Submitted, Approved, Rejected]`
* **Rules**: Requires `WARRANTY_DOC` and `DIAGNOSTIC_REPORT` evidence uploads before transitioning to `Submitted`.

## 2. Annual Maintenance Contract (AMC) Strategy
* **States**: `[Active, Suspended, Expired]`
* **Rules**: Restricts AMC utilization if odometer limits or time thresholds have been breached.

## 3. Field Service Bulletin (FSB) Strategy
* **States**: `[CampaignActive, Completed]`
* **Rules**: Restricts campaign updates to targeted VIN lists provided in campaign configuration.

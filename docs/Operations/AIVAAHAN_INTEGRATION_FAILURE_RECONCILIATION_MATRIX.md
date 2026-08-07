# AIVAAHAN_INTEGRATION_FAILURE_RECONCILIATION_MATRIX.md — Integration Exception & Offline Reconciliation Architecture

## 📌 Executive Summary & Operating Principle

A core principle of the AiVaahan platform is: **WORKSHOP OPERATIONS MUST CONTINUE SAFELY WHEN EXTERNAL INTEGRATIONS FAIL, WHILE INTEGRATION EXCEPTIONS REMAIN VISIBLE AND ACCOUNTABLE.**

When CRM, DMS, or Tata Motors external APIs become unreachable, operational workshop tasks (intake, repair execution, technician timers) proceed using **DWIP Temporary Records**. Upon network restoration, `SyncOrchestrator` automatically reconciles temporary records with external Systems of Record.

---

## 🛠️ CRM Job Card vs DWIP Temporary Job Card Reconciliation

```text
SERVICE ADVISOR INTAKE COMPLETE
             │
             ├──► EXTERNAL API AVAILABLE? ──(YES)──► CREATE CRM JOB CARD
             │                                       Get CRM Job Card ID (e.g. `JC-TATA-2026-0891`)
             │                                       Save to DWIP (`job_cards.job_card_no = 'JC-TATA-2026-0891'`)
             │
             └──► EXTERNAL API OFFLINE? ──(NO)───► CREATE DWIP TEMP JOB CARD
                                                     Get Temp ID (e.g. `DWIP-TEMP-2026-0042`)
                                                     Save to DWIP (`job_cards.job_card_no = 'DWIP-TEMP-2026-0042'`)
                                                     Set `sync_status = 'PENDING_RECONCILIATION'`
                                                     Queue in `SyncOrchestrator`
                                                     │
                                                     ▼
                                            WORKFLOW CONTINUES
                                            (Repair, Parts, Bay allocation proceed)
                                                     │
                                                     ▼
                                            NETWORK RESTORED
                                            `SyncOrchestrator` pushes Temp JC to CRM API
                                            CRM returns official `JC-TATA-2026-0891`
                                            DWIP updates: `job_card_no = 'JC-TATA-2026-0891'`
                                                          `external_reference = 'DWIP-TEMP-2026-0042'`
                                                          `sync_status = 'RECONCILED'`
                                            Audit event logged: `JC_RECONCILED_SUCCESS`
```

---

## 📋 Integration Failure Mode & Reconciliation Matrix

| Failure Mode | Root Cause | Impact on Workshop Operation | Local Fallback Behavior | Reconciliation Trigger | Automatic Reconciliation Action | Manual Fallback Action | Audit Log Event |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. CRM Job Card API Outage** | Tata CRM 500 / Network Timeout | Intake complete; CRM JC ID missing | Generate **DWIP Temp Job Card (`DWIP-TEMP-XXXX`)** | Network reconnection / `SyncOrchestrator` retry | Post Temp JC data to CRM $\rightarrow$ Update `job_cards.job_card_no` | SA taps **[Retry CRM Sync]** in "MY WORK" | `JC_TEMP_CREATED`, `JC_RECONCILED` |
| **2. Vehicle History Lookup Failure** | TMSA API Timeout | 360° History unavailable at Gate-In | Load local cached vehicle passport (`customer_passports`) | Background retry worker | Update local cache with latest CRM history | SA proceeds with local history + warning badge | `HISTORY_FETCH_FAILED` |
| **3. Salesforce DMS Parts Outage** | DMS API Auth Error | Spare part price lookup offline | Use local parts master price list (`parts_models.ts`) | Auth token refresh / API reconnect | Re-verify part prices against DMS before final invoice | Parts clerk enters manual price override | `PARTS_OFFLINE_PRICE_USED` |
| **4. Warranty Verification Failure** | OEM Warranty Server 503 | Claim eligibility check fails | Save claim draft as `PENDING_VERIFICATION` | Scheduled 15-minute retry worker | Submit claim payload to OEM warranty server | Warranty clerk submits claim manually | `WARRANTY_SYNC_QUEUED` |
| **5. FleetEdge Telematics Offline** | Vehicle Telematics Disconnected | GPS/Fault code sync unavailable | Rely on technician diagnostic scanner | Re-poll FleetEdge endpoint | Attach fault codes to VOS attributes | Tech logs fault codes manually | `TELEMATICS_OFFLINE` |
| **6. Billing Invoice Sync Outage** | DMS Invoice API Timeout | Tax invoice generated in DWIP; not in DMS | Invoice saved locally (`invoices.sync_status = 'QUEUED'`) | `dms_import_batches` worker | Bulk upload queued invoices to DMS | Cashier taps **[Force DMS Sync]** | `INVOICE_SYNC_QUEUED` |

---

## ⚡ Real-Time Integration Event Pipeline

```text
DWIP OPERATIONAL EVENT (e.g. `VOS_GATE_IN`)
      │
      ├─► 1. Append Immutable Event to `tbl_workflow_history`
      │
      ├─► 2. Trigger Integration Sync (`SyncOrchestrator.startSync()`)
      │        ├─► SUCCESS: Update `sync_status = 'SYNCED'`
      │        └─► FAILURE: Queue in `dms_import_rows` & Notify User
      │
      ├─► 3. Broadcast WebSocket Message to Mobile Subscribers
      │
      └─► 4. Update User's "MY ATTENTION" Card (if Action Required)
```

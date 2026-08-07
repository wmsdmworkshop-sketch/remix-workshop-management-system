# AIVAAHAN_TMSA_SALESFORCE_INTEGRATION_MATRIX.md — Tata Motors, TMSA & Salesforce Integration Mapping

## 📌 Executive Summary & Integration Architecture

This document specifies the **External System Integration Mapping** connecting the DWIP platform with **TMSA (Tata Motors Service App)**, **Tata Motors CRM**, **Salesforce DMS**, and **FleetEdge Telematics**. 

All integration points are mapped directly from recovered Retrofit networking interfaces (`TmsaApiService.kt`, `tmsa_retrofit_api_inventory.md`) and local synchronization orchestrators (`SyncOrchestrator.ts`).

---

## 🔌 Gate-In → Gate-Out External Integration Mapping & Verification Classification

| Stage | Operational Workflow Event | DWIP Local Data Required | External System | Target API Endpoint | Evidence Classification | Sync Direction | System of Record | Local Data Mapping | Offline & Failure Fallback |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **01** | Vehicle Gate-In | VRN / Chassis No | TMSA / CRM | `GET api/v1/vehicles/registration/{vrn}` | **RETROFIT/PROPOSED** (`TmsaApiService.kt`) | Read | Tata CRM | `vos.vehicle_model`, `chassis_number` | Local DB cache lookup |
| **08** | Service Eligibility & FSV | Chassis No, Odometer | TMSA / CRM | `GET api/v1/vehicles/{vin}` | **RETROFIT/PROPOSED** (`TmsaApiService.kt`) | Read | Tata CRM | `vos.warranty_status_at_gate_in` | Offline cached passport |
| **10** | CRM Job Card Creation | VRN, Complaints, SA ID | Tata CRM / DMS | `POST api/v1/job-cards` | **CODE-IMPLEMENTED** (`SyncOrchestrator.ts`) | Write | Tata CRM | `job_cards.job_card_no` | **DWIP Temp Job Card (`DWIP-TEMP-XXXX`)** |
| **14** | Parts Requisition & Stock | Part Numbers, Quantities | Salesforce DMS | `GET api/v1/parts/inventory` | **DOCUMENTED CONTRACT** / **MOCK/STUB** | Read | Salesforce DMS | `parts_models.ts` | Local workshop inventory DB |
| **15** | Warranty Claim Eligibility | Failed Part Photo, Vin | TMSA Warranty | `POST api/v1/warranty/eligibility` | **RETROFIT/PROPOSED** (`TmsaApiService.kt`) | Read/Write | TMSA Warranty | `warranty_claims` | Draft claim saved locally |
| **19** | Fleet Telematics Fault Sync| VIN, GPS Coordinates | FleetEdge | `GET api/v1/telematics/faults/{vin}` | **DOCUMENTED CONTRACT** / **MOCK/STUB** | Read | FleetEdge | `vos_attributes` | Telematics queue retry |
| **25** | Billing & Tax Invoice Sync | Labor, Parts, GST Details| Salesforce DMS | `POST api/v1/invoices/sync` | **CODE-IMPLEMENTED** (`dms_import_rows`) | Write | Salesforce DMS | `invoices.invoice_no` | Invoice queued in `dms_import_rows` |
| **28** | Gate-Out Closure | Gate Pass ID, Rear Photo | TMSA / CRM | `POST api/v1/job-cards/{id}/status` | **RETROFIT/PROPOSED** (`TmsaApiService.kt`) | Write | DWIP / CRM | `vos.gate_out_time` | Offline sync queue retry |

---

## 📡 API Technical Specifications (Recovered Retrofit Specifications)

### 1. Vehicle History & Eligibility Lookup (`GET api/v1/vehicles/{vin}`)
- **Header**: `Authorization: Bearer <Token>`, `X-Source-System: TMSA_ANDROID_APP`
- **Request**: `vin: string`
- **Response**: `DwipVehicleResponse` (`vehicleModel`, `warrantyStatus`, `lastServiceDate`, `fsvEligible`)
- **Local Mapping**: Populates `vos` session attributes on Gate-In.

### 2. CRM Job Card Creation (`POST api/v1/job-cards`)
- **Header**: `Authorization: Bearer <Token>`
- **Request**: `{ vrn, vin, customerMobile, srTypeId, jobDescription, advisorEmployeeCode }`
- **Response**: `{ success: true, crmJobCardNo: "JC-TATA-2026-0991", createdAt: "2026-08-02T10:15:00Z" }`
- **Local Mapping**: Updates `job_cards.job_card_no = crmJobCardNo`, sets `sync_status = 'SYNCED'`.

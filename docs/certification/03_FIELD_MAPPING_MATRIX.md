# 03. Enterprise Field Mapping Matrix

## Purpose
Comprehensive mapping matrix linking every field displayed in DWIP V1 across all modules directly to its source DMS TSV file, database table/column, backend service, API endpoint, and UI component.

## Field Mapping Matrix Table

| Module | Screen | Field Name | Source TSV | Database Table | Database Column | Repository / Service | API Endpoint | Frontend Component | Transformation Rule | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Vehicle Passport | Header | Chassis No (VIN) | `vehicle_master.tsv` | `vehicle_master` | `chassis_number` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `VehicleHeader.tsx` | Clean string trim | **PASS** |
| Vehicle Passport | Header | Registration No (VRN) | `vehicle_master.tsv` | `vehicle_master` | `registration_no` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `VehicleHeader.tsx` | Uppercase sanitize | **PASS** |
| Vehicle Passport | Header | Engine No | `vehicle_master.tsv` | `vehicle_master` | `engine_no` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `VehicleHeader.tsx` | Alphanumeric clean | **PASS** |
| Vehicle Passport | Header | Product Line (Model) | `vehicle_master.tsv` | `vehicle_master` | `product_line` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `VehicleHeader.tsx` | Trim & uppercase | **PASS** |
| Vehicle Passport | Customer Profile | Owner Account Name | `vehicle_master.tsv` | `vehicle_master` | `owner_account_name` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `CustomerProfile.tsx` | Proper Title Case | **PASS** |
| Vehicle Passport | Dates & Warranty | Original Sale Date | `vehicle_master.tsv` | `vehicle_master` | `original_sale_date` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `WarrantyBadge.tsx` | ISO-8601 YYYY-MM-DD | **PASS** |
| Vehicle Passport | Dates & Warranty | Warranty Expiry Date | `vehicle_master.tsv` | `vehicle_master` | `warranty_expiry_date` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `WarrantyBadge.tsx` | ISO-8601 YYYY-MM-DD | **PASS** |
| Vehicle Passport | Dates & Warranty | Warranty Expiry KM | `vehicle_master.tsv` | `vehicle_master` | `warranty_expiry_km` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `WarrantyBadge.tsx` | Integer parse | **PASS** |
| Service History | Visit Ledger | Service Request (SR) # | `service_history.tsv` | `service_history` | `service_request` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `VisitLedger.tsx` | String trim | **PASS** |
| Service History | Visit Ledger | Job Card Open Date | `service_history.tsv` | `service_history` | `job_card_open_date` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `VisitLedger.tsx` | ISO-8601 conversion | **PASS** |
| Service History | Visit Ledger | Odometer Reading | `service_history.tsv` | `service_history` | `odometer_reading` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `VisitLedger.tsx` | Non-numeric strip | **PASS** |
| Service History | Visit Ledger | SR Type | `service_history.tsv` | `service_history` | `sr_type` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `VisitLedger.tsx` | Trim & fallback | **PASS** |
| Service History | Visit Ledger | Summary | `service_history.tsv` | `service_history` | `summary` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `VisitLedger.tsx` | Text sanitize | **PASS** |
| Invoice History | Billing | Invoice # | `invoice.tsv` | `invoices` | `invoice_no` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `BillingBreakdown.tsx` | String trim | **PASS** |
| Invoice History | Billing | Invoice Date | `invoice.tsv` | `invoices` | `invoice_date` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `BillingBreakdown.tsx` | ISO-8601 YYYY-MM-DD | **PASS** |
| Invoice History | Billing | Final Labour Amount | `invoice.tsv` | `invoices` | `final_labour_amount` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `BillingBreakdown.tsx` | Float parse ('Rs.' strip) | **PASS** |
| Invoice History | Billing | Final Spares Amount | `invoice.tsv` | `invoices` | `final_spares_amount` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `BillingBreakdown.tsx` | Float parse ('Rs.' strip) | **PASS** |
| Invoice History | Billing | Consolidated Total | `invoice.tsv` | `invoices` | `final_consolidated_amount` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `BillingBreakdown.tsx` | Float parse ('Rs.' strip) | **PASS** |
| Invoice History | Billing | Invoice Status | `invoice.tsv` | `invoices` | `invoice_status` | `VehiclePassportFacade` | `GET /api/vehicle-passport/search` | `BillingBreakdown.tsx` | Status uppercase | **PASS** |

## Verification Summary
* **Total Fields Mapped:** 19 core fields across 3 primary DMS domains
* **Field Certification Rate:** **100.00% PASS**

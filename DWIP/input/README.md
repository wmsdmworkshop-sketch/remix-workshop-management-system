# DWIP Input Folders

Drop CSV files into the correct subfolder based on dataset type:

| Folder           | Dataset Type     | Expected Headers (minimum)          |
|------------------|-----------------|-------------------------------------|
| invoices/        | Invoice History  | J C NO, VRN, INVOICE DATE, TOTAL    |
| vehicle_master/  | Vehicle Master   | VRN, CHASSIS NO, ENGINE NO, MODEL   |
| service_history/ | Service History  | J C NO, VRN, SR TYPE, ODOMETER      |
| customers/       | Customer Master  | VRN, NAME, PHONE, ADDRESS           |
| warranty/        | Warranty Claims  | J C NO, VRN, SR TYPE                |
| breakdown/       | Breakdowns       | J C NO, VRN, SR TYPE                |

**Rules:**
- File names do not matter — the ETL auto-detects based on column signatures.
- Multiple files in the same folder are all processed and merged.
- All files must be UTF-8 or Latin-1 encoded CSV.

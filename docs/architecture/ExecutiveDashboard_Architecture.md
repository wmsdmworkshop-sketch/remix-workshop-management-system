# Executive Dashboard Architecture

This document describes the architectural layout of the **Executive Operations Command Center** within the Devanand Workshop Management System (DWIP).

## 1. Multi-Branch Aggregation
- **Location Segments**: Dynamically partitions active runtime feeds (`jobCards`, `bays`, `employees`, `alertLogs`) into distinct data buckets matching Sedam Road, Gulbarga, Basavakalyan, Shahapur, and Yadgir.
- **Enterprise-Wide Map**: Visualizes the consolidated status across the 6 major pipeline stages (Gate Entry, Reception, Advisor, Workshop, QC, Billing).

## 2. Power BI Exporter Interface
- Exposes critical operation datasets (revenue achievements, bay utilization ratios, and CSI trends) into a unified JSON format schema, ready for Power BI desktop loading.

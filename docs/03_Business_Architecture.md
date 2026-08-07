# DWIP Business Architecture
**Automotive Service Lifecycle & Financial Programs Mapping**

## 1. The Dealership Lifecycle
DWIP coordinates the standard dealership workflow:
1. **Vehicle Reception (Gate-in)**: Check-in, inventory capturing, and recording of customer complaints.
2. **Estimation & Approval**: Advisor diagnostics, parts/labor pricing estimation, and customer approval.
3. **Allocation & Work-in-Progress (WIP)**: Bay allocation and technician assignment.
4. **Quality Check (QC)**: Verification and road testing logs.
5. **Invoicing & Billing**: Revenue split engine calculations (Labour vs. Parts), contract claims.
6. **Vehicle Delivery (Gate-out)**: Final vehicle release.

## 2. Business Programs Integration
* **Warranty Claims**: Automatically triggers when parts or repairs are tagged as warranty-covered, validating claims against OEM parameters.
* **Annual Maintenance Contracts (AMC)**: Deducts parts/labor costs based on active AMC policy limits.
* **Fleet Owner Contracts**: Groups vehicles under organization accounts for centralized invoicing and credit limits.

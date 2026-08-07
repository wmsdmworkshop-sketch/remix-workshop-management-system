# AiVaahan Tenant Onboarding Verification Checklist

**Tenant Scope**: Customer #2 Onboarding Framework  
**Baseline Version**: `v1.1.0-RC1`

---

## Pre-Onboarding Readiness Checklist

- [x] **Tenant Identity**: `companyId` and `dealerId` generated and validated.
- [x] **Data Isolation Guard**: Cross-tenant record filter verified.
- [x] **Branch Infrastructure**: Initial physical workshop branches defined (`branchId`).
- [x] **Admin Credentials**: Primary Dealer Admin user created with RBAC privileges.
- [x] **License Key**: Product edition license key generated and assigned.
- [x] **Feature Flags**: 4-tier feature flag profile applied via `FeatureFlagService`.
- [x] **OEM Gateway**: Required OEM provider adapters (`TMSA`, `QRT`, `EPC`, `Eguru`) enabled.
- [x] **Customer Portal**: Dealer Admin self-service portal route verified (`/customer-portal/`).
- [x] **Billing Profile**: Tax (GST), invoicing cycle, and payment gateway profile established.
- [x] **Support SLA**: Support tier assigned and escalation paths verified.

# AIVAAHAN Commercial Multi-Tenant SaaS Roadmap

**Platform**: AiVaahan Enterprise Multi-Tenant Platform  
**Target Release Schedule**: Q3 2026 – Q2 2027

---

## Roadmap Phases

```
+---------------------------------------------------------------------------------+
| Phase 1: Reference Tenant Stabilization (Tenant 001 - Devanand Automobiles)      |
| Q3 2026 | DWIP-RC1 Release | Closed Beta Pilot | Production Baseline            |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
| Phase 2: Automated Multi-Tenant Provisioning & Onboarding                      |
| Q4 2026 | Tenant Self-Service Onboarding | Subdomain Routing | Feature Toggling   |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
| Phase 3: Commercial Metering & Subscription Billing Engine                      |
| Q1 2027 | Tiered Pricing (Starter, Pro, Enterprise) | Automated License Check     |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
| Phase 4: White-Labeling & Multi-OEM Expansion                                   |
| Q2 2027 | Custom Branding | Multi-OEM Gateway Adapters (Ashok Leyland, Eicher)   |
+---------------------------------------------------------------------------------+
```

---

## Detailed Milestone Execution

### Phase 1: Reference Tenant Sign-Off (Current)
- Complete Google Play Closed Beta testing for Devanand Automobiles (`DLR-MUM-01`).
- Freeze core DB schema (`DWIP-DB-001 v1.0`) and core platform engines.

### Phase 2: Multi-Tenant Provisioning Engine (Q4 2026)
- Implement `TenantProvisioningService` to onboard new dealership enterprises.
- Assign dedicated `companyId` and `dealerId` isolation pools automatically.

### Phase 3: Billing & Subscription Engine (Q1 2027)
- Usage-based metering: Track active Job Card volume, active workshop bays, and QRT dispatch count.
- Stripe / Razorpay recurring subscription billing integration.

### Phase 4: Multi-OEM Ecosystem Expansion (Q2 2027)
- Expand Integration Gateway (`DWIP-INT-ARCH-001 v1.0`) with additional OEM adapters:
  - `AshokLeylandProviderAdapter`
  - `EicherProviderAdapter`
  - `MahindraTrucksProviderAdapter`
